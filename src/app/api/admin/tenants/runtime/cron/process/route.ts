import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";

function parseCronNextRun(cronExpr: string, timezone: string, lastRun: Date): Date {
  // Simple cron parser for common patterns
  // Format: minute hour * * * (only supports minute/hour for now)
  const parts = cronExpr.trim().split(/\s+/);
  const minute = parts[0] === "*" ? lastRun.getMinutes() : parseInt(parts[0], 10);
  const hour = parts.length > 1 && parts[1] !== "*" ? parseInt(parts[1], 10) : lastRun.getHours();

  const next = new Date(lastRun);
  next.setMinutes(minute);
  next.setHours(hour);
  next.setSeconds(0);
  next.setMilliseconds(0);

  // If the calculated time is in the past, advance to next day
  if (next <= lastRun) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export async function POST(request: Request) {
  const expectedTokens = [
    process.env.CRON_SECRET,
    process.env.TENANT_RUNTIME_PROCESSOR_TOKEN,
  ].filter((v): v is string => !!v && v.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const token = bearerHeader?.toLowerCase().startsWith("bearer ")
    ? bearerHeader.slice(7).trim()
    : null;

  if (!token || !constantTimeTokenInSet(token, expectedTokens)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Find due scheduled messages
    const { data: dueMessages, error: queryError } = await admin
      .from("tenant_scheduled_messages")
      .select(`
        id, tenant_id, customer_id, agent_id, channel_id,
        schedule_key, cron_expression, timezone, last_run_at
      `)
      .eq("enabled", true)
      .lte("next_run_at", now)
      .limit(50);

    if (queryError) {
      return NextResponse.json(
        { error: safeErrorMessage(queryError, "Failed to query scheduled messages") },
        { status: 500 }
      );
    }

    if (!dueMessages || dueMessages.length === 0) {
      return NextResponse.json({ processed: 0, enqueued: 0 });
    }

    let enqueued = 0;

    for (const msg of dueMessages) {
      try {
        // Enqueue as a cron run
        await enqueueDiscordRuntimeRun(admin, {
          tenantId: msg.tenant_id,
          customerId: msg.customer_id,
          runKind: "discord_runtime",
          requestTraceId: `cron-${msg.id}-${Date.now()}`,
          idempotencyKey: `cron-${msg.id}-${now.slice(0, 13)}`, // Hourly dedup
          payload: {
            channel_id: msg.channel_id,
            content: `[cron:${msg.schedule_key}]`,
            run_kind: "discord_cron",
            schedule_key: msg.schedule_key,
            agent_id: msg.agent_id,
          },
          metadata: {
            cron_schedule_id: msg.id,
            schedule_key: msg.schedule_key,
            cron_expression: msg.cron_expression,
          },
        });

        // Update last_run_at and next_run_at
        const nextRun = parseCronNextRun(
          msg.cron_expression,
          msg.timezone || "America/Chicago",
          new Date()
        );

        await admin
          .from("tenant_scheduled_messages")
          .update({
            last_run_at: now,
            next_run_at: nextRun.toISOString(),
            updated_at: now,
          })
          .eq("id", msg.id);

        enqueued += 1;
      } catch (err) {
        console.error(`[cron] Failed to enqueue schedule ${msg.id}:`, safeErrorMessage(err));
      }
    }

    return NextResponse.json({
      processed: dueMessages.length,
      enqueued,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Cron processing failed") },
      { status: 500 }
    );
  }
}
