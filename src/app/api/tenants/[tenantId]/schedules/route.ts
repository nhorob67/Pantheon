import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { createCustomScheduleSchema } from "@/lib/validators/schedule";
import { computeNextRun } from "@/lib/schedules/compute-next-run";

const paramsSchema = z.object({ tenantId: z.uuid() });
const MAX_CUSTOM_SCHEDULES = 25;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list schedules",
    },
    async ({ admin, tenantContext }) => {
      const url = new URL(request.url);
      const agentIdFilter = url.searchParams.get("agent_id");

      let query = admin
        .from("tenant_scheduled_messages")
        .select(
          "id, schedule_key, cron_expression, timezone, enabled, last_run_at, next_run_at, agent_id, channel_id, metadata, schedule_type, display_name, prompt, tools, created_by, created_at, updated_at, tenant_agents(display_name)"
        )
        .eq("tenant_id", tenantContext.tenantId)
        .order("enabled", { ascending: false })
        .order("created_at", { ascending: false });

      if (agentIdFilter) {
        query = query.eq("agent_id", agentIdFilter);
      }

      const { data: schedules, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const mapped = (schedules || []).map((s) => {
        const agentJoin = s.tenant_agents as
          | { display_name: string }
          | { display_name: string }[]
          | null;
        const agentName = agentJoin
          ? Array.isArray(agentJoin)
            ? agentJoin[0]?.display_name ?? null
            : agentJoin.display_name
          : null;

        return {
          id: s.id,
          schedule_key: s.schedule_key,
          cron_expression: s.cron_expression,
          timezone: s.timezone,
          enabled: s.enabled,
          last_run_at: s.last_run_at,
          next_run_at: s.next_run_at,
          agent_id: s.agent_id,
          agent_name: agentName,
          channel_id: s.channel_id,
          metadata: s.metadata,
          schedule_type: s.schedule_type ?? "predefined",
          display_name: s.display_name,
          prompt: s.prompt,
          tools: s.tools ?? [],
          created_by: s.created_by ?? "system",
          created_at: s.created_at,
          updated_at: s.updated_at,
        };
      });

      return NextResponse.json({ schedules: mapped });
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to create schedule",
    },
    async ({ admin, tenantContext }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const bodyParsed = createCustomScheduleSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
          { status: 400 }
        );
      }

      // Enforce custom schedule limit + verify agent ownership in parallel
      const [countResult, agentResult] = await Promise.all([
        admin
          .from("tenant_scheduled_messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantContext.tenantId)
          .eq("schedule_type", "custom"),
        admin
          .from("tenant_agents")
          .select("id")
          .eq("id", bodyParsed.data.agent_id)
          .eq("tenant_id", tenantContext.tenantId)
          .maybeSingle(),
      ]);

      if (countResult.error) {
        return NextResponse.json({ error: countResult.error.message }, { status: 500 });
      }

      if ((countResult.count ?? 0) >= MAX_CUSTOM_SCHEDULES) {
        return NextResponse.json(
          { error: `Maximum of ${MAX_CUSTOM_SCHEDULES} custom schedules reached` },
          { status: 400 }
        );
      }

      if (agentResult.error || !agentResult.data) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      const scheduleKey = `custom_${crypto.randomUUID().slice(0, 8)}`;
      const nextRunAt = computeNextRun(
        bodyParsed.data.cron_expression,
        bodyParsed.data.timezone
      );

      const { data: created, error: insertError } = await admin
        .from("tenant_scheduled_messages")
        .insert({
          tenant_id: tenantContext.tenantId,
          customer_id: tenantContext.customerId,
          agent_id: bodyParsed.data.agent_id,
          channel_id: bodyParsed.data.channel_id,
          schedule_key: scheduleKey,
          cron_expression: bodyParsed.data.cron_expression,
          timezone: bodyParsed.data.timezone,
          enabled: true,
          next_run_at: nextRunAt,
          schedule_type: "custom",
          display_name: bodyParsed.data.display_name,
          prompt: bodyParsed.data.prompt,
          tools: bodyParsed.data.tools || [],
          created_by: "dashboard",
        })
        .select("id, schedule_key, cron_expression, timezone, enabled, next_run_at, schedule_type, display_name, prompt, tools, created_by, created_at")
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ schedule: created }, { status: 201 });
    }
  );
}
