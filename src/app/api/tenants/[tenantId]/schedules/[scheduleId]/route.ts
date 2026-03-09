import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { updateCustomScheduleSchema, updateScheduleNotificationsSchema } from "@/lib/validators/schedule";
import { computeNextRun } from "@/lib/schedules/compute-next-run";

const paramsSchema = z.object({ tenantId: z.uuid(), scheduleId: z.uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; scheduleId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or schedule ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load schedule",
    },
    async ({ admin, tenantContext }) => {
      const { data: schedule, error } = await admin
        .from("tenant_scheduled_messages")
        .select(
          "id, schedule_key, cron_expression, timezone, enabled, last_run_at, next_run_at, agent_id, channel_id, metadata, schedule_type, display_name, prompt, tools, created_by, created_at, updated_at, tenant_agents(display_name)"
        )
        .eq("id", parsed.data.scheduleId)
        .eq("tenant_id", tenantContext.tenantId)
        .maybeSingle();

      if (error || !schedule) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }

      return NextResponse.json({ schedule });
    }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; scheduleId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or schedule ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to update schedule",
    },
    async ({ admin, tenantContext }) => {
      // Verify schedule exists
      const { data: existing, error: fetchError } = await admin
        .from("tenant_scheduled_messages")
        .select("id, schedule_type, cron_expression, timezone")
        .eq("id", parsed.data.scheduleId)
        .eq("tenant_id", tenantContext.tenantId)
        .maybeSingle();

      if (fetchError || !existing) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      // Allow notify_on_failure updates on any schedule type
      const notifOnly = updateScheduleNotificationsSchema.safeParse(body);
      if (notifOnly.success && Object.keys(body as object).length === 1) {
        const { error: updateError } = await admin
          .from("tenant_scheduled_messages")
          .update({
            notify_on_failure: notifOnly.data.notify_on_failure,
            updated_at: new Date().toISOString(),
          })
          .eq("id", parsed.data.scheduleId);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        return NextResponse.json({ updated: true, notify_on_failure: notifOnly.data.notify_on_failure });
      }

      // Full updates require custom schedule type
      if (existing.schedule_type !== "custom") {
        return NextResponse.json(
          { error: "Only custom schedules can be edited" },
          { status: 400 }
        );
      }

      const bodyParsed = updateCustomScheduleSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
          { status: 400 }
        );
      }

      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (bodyParsed.data.display_name !== undefined) update.display_name = bodyParsed.data.display_name;
      if (bodyParsed.data.prompt !== undefined) update.prompt = bodyParsed.data.prompt;
      if (bodyParsed.data.tools !== undefined) update.tools = bodyParsed.data.tools;
      if (bodyParsed.data.enabled !== undefined) update.enabled = bodyParsed.data.enabled;
      if (bodyParsed.data.notify_on_failure !== undefined) update.notify_on_failure = bodyParsed.data.notify_on_failure;

      if (bodyParsed.data.cron_expression !== undefined) {
        update.cron_expression = bodyParsed.data.cron_expression;
      }
      if (bodyParsed.data.timezone !== undefined) {
        update.timezone = bodyParsed.data.timezone;
      }

      // Recompute next_run_at if cron or timezone changed, or if re-enabling
      const cronChanged = bodyParsed.data.cron_expression !== undefined;
      const tzChanged = bodyParsed.data.timezone !== undefined;
      const enabling = bodyParsed.data.enabled === true;

      if (cronChanged || tzChanged || enabling) {
        const cron = bodyParsed.data.cron_expression ?? existing.cron_expression;
        const tz = bodyParsed.data.timezone ?? existing.timezone;
        const shouldBeEnabled = bodyParsed.data.enabled ?? true;
        update.next_run_at = shouldBeEnabled ? computeNextRun(cron, tz) : null;
      }

      if (bodyParsed.data.enabled === false) {
        update.next_run_at = null;
      }

      const { data: updated, error: updateError } = await admin
        .from("tenant_scheduled_messages")
        .update(update)
        .eq("id", parsed.data.scheduleId)
        .select("id, schedule_key, cron_expression, timezone, enabled, next_run_at, schedule_type, display_name, prompt, tools, updated_at")
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ schedule: updated });
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; scheduleId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or schedule ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to delete schedule",
    },
    async ({ admin, tenantContext }) => {
      // Verify schedule exists and is custom
      const { data: existing, error: fetchError } = await admin
        .from("tenant_scheduled_messages")
        .select("id, schedule_type")
        .eq("id", parsed.data.scheduleId)
        .eq("tenant_id", tenantContext.tenantId)
        .maybeSingle();

      if (fetchError || !existing) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }

      if (existing.schedule_type !== "custom") {
        return NextResponse.json(
          { error: "Predefined schedules cannot be deleted — use toggle instead" },
          { status: 400 }
        );
      }

      const { error: deleteError } = await admin
        .from("tenant_scheduled_messages")
        .delete()
        .eq("id", parsed.data.scheduleId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ deleted: true });
    }
  );
}
