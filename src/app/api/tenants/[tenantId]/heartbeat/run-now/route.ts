import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { executeHeartbeatForConfig, resolveHeartbeatConfig, type HeartbeatConfigRow } from "@/lib/heartbeat/processor";
import { processRuntimeRun } from "@/trigger/process-runtime-run";
import { recordHeartbeatOperatorEvent } from "@/lib/heartbeat/events";
import { resolveEffectiveManualConfigs } from "@/lib/heartbeat/effective-configs";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { runHeartbeatNowSchema } from "@/lib/validators/heartbeat";
import { auditLog } from "@/lib/security/audit";

const paramsSchema = z.object({ tenantId: z.uuid() });

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
  if (parsed instanceof Response) {
    return parsed;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to run heartbeat now",
    },
    async ({ admin, tenantContext, user, requestTraceId }) => {
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }

      const bodyParsed = runHeartbeatNowSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
          { status: 400 }
        );
      }

      const { data: configRows, error } = await admin
        .from("tenant_heartbeat_configs")
        .select(
          "id, tenant_id, customer_id, agent_id, enabled, interval_minutes, timezone, active_hours_start, active_hours_end, checks, custom_checks, delivery_channel_id, cooldown_minutes, max_alerts_per_day, digest_enabled, digest_window_minutes, reminder_interval_minutes, heartbeat_instructions, last_run_at, next_run_at"
        )
        .eq("tenant_id", tenantContext.tenantId)
        .order("agent_id", {
          ascending: true,
          nullsFirst: true,
        });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const resolvedConfigs = (configRows || []).map((row) =>
        resolveHeartbeatConfig(row as HeartbeatConfigRow)
      );
      const configsToExecute = resolveEffectiveManualConfigs(
        resolvedConfigs,
        bodyParsed.data.config_id
      );

      if (configsToExecute.length === 0) {
        return NextResponse.json(
          { error: "No heartbeat configuration found" },
          { status: 404 }
        );
      }

      const results = [];
      for (const config of configsToExecute) {
        const result = await executeHeartbeatForConfig({
          admin,
          config,
          triggerMode: bodyParsed.data.preview_only ? "manual_preview" : "manual_run",
          now: new Date(),
          requestTraceId,
          previewOnly: bodyParsed.data.preview_only,
          respectActiveHours: false,
          updateSchedule: false,
        });

        if (result.runtimeRunId) {
          await processRuntimeRun.trigger({ runId: result.runtimeRunId });
        }

        results.push({
          config_id: result.configId,
          agent_id: config.agent_id,
          heartbeat_run_id: result.heartbeatRunId ?? null,
          runtime_run_id: result.runtimeRunId ?? null,
          status: result.status,
          had_signal: result.hadSignal ?? false,
          delivery_status: result.deliveryStatus ?? "not_applicable",
          suppressed_reason: result.suppressedReason ?? null,
          preview_text: result.previewText ?? null,
        });

        await recordHeartbeatOperatorEvent({
          admin,
          tenantId: tenantContext.tenantId,
          customerId: tenantContext.customerId,
          configId: config.id,
          agentId: config.agent_id,
          actorUserId: user.id,
          eventType: bodyParsed.data.preview_only ? "manual_preview" : "manual_run",
          summary: bodyParsed.data.preview_only
            ? "Ran heartbeat preview"
            : "Ran heartbeat manually",
          metadata: {
            delivery_status: result.deliveryStatus ?? "not_applicable",
            suppressed_reason: result.suppressedReason ?? null,
            runtime_run_id: result.runtimeRunId ?? null,
            heartbeat_run_id: result.heartbeatRunId ?? null,
          },
        });
      }

      auditLog({
        action: bodyParsed.data.preview_only
          ? "tenant.heartbeat.preview"
          : "tenant.heartbeat.run_now",
        actor: user.id,
        resource_type: "tenant_heartbeat_config",
        resource_id: configsToExecute[0]?.id ?? tenantContext.tenantId,
        details: {
          tenant_id: tenantContext.tenantId,
          preview_only: bodyParsed.data.preview_only,
          config_ids: configsToExecute.map((config) => config.id),
          result_count: results.length,
          delivery_statuses: results.map((result) => result.delivery_status),
          suppressed_reasons: results
            .map((result) => result.suppressed_reason)
            .filter((value) => value !== null),
        },
      });

      return NextResponse.json({
        results,
      });
    }
  );
}
