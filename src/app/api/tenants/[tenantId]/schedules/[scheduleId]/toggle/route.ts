import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { computeNextRun } from "@/lib/schedules/compute-next-run";

const paramsSchema = z.object({ tenantId: z.uuid(), scheduleId: z.uuid() });
const toggleBodySchema = z.object({ enabled: z.boolean() });

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
      fallbackErrorMessage: "Failed to toggle schedule",
    },
    async ({ admin, tenantContext }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const bodyParsed = toggleBodySchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Body must include { enabled: boolean }" },
          { status: 400 }
        );
      }

      const { enabled } = bodyParsed.data;

      // Verify the schedule belongs to this tenant
      const { data: schedule, error: fetchError } = await admin
        .from("tenant_scheduled_messages")
        .select("id, cron_expression, timezone, metadata")
        .eq("id", parsed.data.scheduleId)
        .eq("tenant_id", tenantContext.tenantId)
        .maybeSingle();

      if (fetchError || !schedule) {
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      // Compute next_run_at when enabling using cron-parser
      let next_run_at: string | null = null;
      if (enabled) {
        const tz = schedule.timezone || "America/Chicago";
        try {
          next_run_at = computeNextRun(schedule.cron_expression, tz);
        } catch {
          // Fallback: set next run to now + 1 hour
          next_run_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }
      }

      const { error: updateError } = await admin
        .from("tenant_scheduled_messages")
        .update({
          enabled,
          next_run_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.scheduleId)
        .eq("tenant_id", tenantContext.tenantId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ updated: true, enabled, next_run_at });
    }
  );
}
