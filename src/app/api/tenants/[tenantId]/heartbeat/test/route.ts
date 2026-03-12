import { NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  queueHeartbeatDelivery,
  resolveHeartbeatConfig,
  type HeartbeatConfigRow,
} from "@/lib/heartbeat/processor";
import { recordHeartbeatOperatorEvent } from "@/lib/heartbeat/events";
import { resolveEffectiveManualConfigs } from "@/lib/heartbeat/effective-configs";
import { processRuntimeRun } from "@/trigger/process-runtime-run";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { sendHeartbeatTestSchema } from "@/lib/validators/heartbeat";
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
      fallbackErrorMessage: "Failed to send heartbeat test",
    },
    async ({ admin, tenantContext, user, requestTraceId }) => {
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }

      const bodyParsed = sendHeartbeatTestSchema.safeParse(body);
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
          { error: "No heartbeat configuration found for test delivery" },
          { status: 404 }
        );
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const results = [];

      for (const config of configsToExecute) {
        if (!config.delivery_channel_id) {
          results.push({
            config_id: config.id,
            agent_id: config.agent_id,
            heartbeat_run_id: null,
            runtime_run_id: null,
            status: "missing_delivery_channel",
            delivery_status: "not_applicable",
            message:
              "This config does not have a delivery channel. Select a Discord channel before sending a test.",
          });
          await recordHeartbeatOperatorEvent({
            admin,
            tenantId: tenantContext.tenantId,
            customerId: tenantContext.customerId,
            configId: config.id,
            agentId: config.agent_id,
            actorUserId: user.id,
            eventType: "manual_test",
            summary: "Heartbeat test send blocked: missing delivery channel",
            metadata: {
              delivery_status: "not_applicable",
            },
          });
          continue;
        }

        const { data: insertedRun, error: insertError } = await admin
          .from("tenant_heartbeat_runs")
          .insert({
            config_id: config.id,
            tenant_id: config.tenant_id,
            ran_at: nowIso,
            run_slot: null,
            trigger_mode: "manual_test",
            checks_executed: {
              synthetic_test: {
                status: "alert",
                summary:
                  "Synthetic heartbeat delivery test requested by an operator.",
                data: {
                  requested_at: nowIso,
                  config_id: config.id,
                  agent_id: config.agent_id,
                },
              },
            },
            check_durations: {},
            signal_fingerprints: [`synthetic_test:${config.id}:${nowIso.slice(0, 16)}`],
            had_signal: true,
            llm_invoked: true,
            delivery_attempted: true,
            delivery_status: "queued",
            suppressed_reason: null,
            decision_trace: {
              request_trace_id: requestTraceId,
              preview_only: false,
              had_signal: true,
              check_results: [{ key: "synthetic_test", status: "alert" }],
              signal_types: ["synthetic_test"],
              signal_fingerprints: [`synthetic_test:${config.id}:${nowIso.slice(0, 16)}`],
              issue_counts: {
                active: 1,
                new: 1,
                updated: 0,
                resolved: 0,
                notification_candidates: 1,
              },
              lifecycle_suppressed_reasons: [],
              busy_runtime_reason: null,
              selected_signal_types: ["synthetic_test"],
              selected_attention_types: ["new_issue"],
              delivery_attempted: true,
              delivery_status: "queued",
              final_state: "queued",
              final_reason: null,
            },
            freshness_metadata: {
              synthetic_test: {
                requested_at: nowIso,
              },
            },
            dispatch_metadata: {
              request_trace_id: requestTraceId,
              test_mode: true,
            },
            duration_ms: 0,
            error_message: null,
          })
          .select("id")
          .single();

        if (insertError || !insertedRun) {
          return NextResponse.json(
            { error: insertError?.message || "Failed to create heartbeat test run" },
            { status: 500 }
          );
        }

        const scopeLabel = config.agent_id ? "agent override" : "tenant default";
        const runtimeRunId = await queueHeartbeatDelivery({
          admin,
          config,
          heartbeatRunId: insertedRun.id as string,
          requestTraceId,
          now,
          signalSummaries: [
            `Synthetic heartbeat delivery test for the ${scopeLabel}. No live issue is being reported.`,
          ],
          signalData: {
            synthetic_test: {
              requested_at: nowIso,
              config_id: config.id,
              agent_id: config.agent_id,
              scope: scopeLabel,
            },
          },
          issueContexts: [
            {
              fingerprint: `synthetic_test:${config.id}`,
              attention_type: "new_issue",
              signal_type: "synthetic_test",
              severity: 1,
              state: "new",
              summary:
                "Synthetic heartbeat delivery test requested by an operator. This is not a live issue.",
              first_seen_at: nowIso,
              last_notified_at: null,
              snoozed_until: null,
            },
          ],
          testMode: true,
        });

        await processRuntimeRun.trigger({ runId: runtimeRunId });

        results.push({
          config_id: config.id,
          agent_id: config.agent_id,
          heartbeat_run_id: insertedRun.id as string,
          runtime_run_id: runtimeRunId,
          status: "queued",
          delivery_status: "queued",
          message: "Synthetic heartbeat test queued for delivery.",
        });

        await recordHeartbeatOperatorEvent({
          admin,
          tenantId: tenantContext.tenantId,
          customerId: tenantContext.customerId,
          configId: config.id,
          agentId: config.agent_id,
          actorUserId: user.id,
          eventType: "manual_test",
          summary: "Queued heartbeat test send",
          metadata: {
            delivery_status: "queued",
            heartbeat_run_id: insertedRun.id as string,
            runtime_run_id: runtimeRunId,
          },
        });
      }

      auditLog({
        action: "tenant.heartbeat.test_send",
        actor: user.id,
        resource_type: "tenant_heartbeat_config",
        resource_id: configsToExecute[0]?.id ?? tenantContext.tenantId,
        details: {
          tenant_id: tenantContext.tenantId,
          config_ids: configsToExecute.map((config) => config.id),
          result_count: results.length,
          statuses: results.map((result) => result.status),
        },
      });

      return NextResponse.json({ results });
    }
  );
}
