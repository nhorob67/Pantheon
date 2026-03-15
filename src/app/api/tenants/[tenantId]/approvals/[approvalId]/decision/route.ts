import { NextResponse } from "next/server.js";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  tenantApprovalDecisionRequestSchema,
  tenantApprovalDecisionRouteParamsSchema,
} from "@/lib/runtime/tenant-api-contracts";
import {
  isHeartbeatApprovalPayload,
  type HeartbeatApprovalRequestPayload,
} from "@/lib/heartbeat/approvals";
import {
  markHeartbeatRunDeliveryStatus,
  queueHeartbeatDelivery,
  resolveHeartbeatConfig,
  type HeartbeatConfigRow,
} from "@/lib/heartbeat/processor";
import { hasMinimumTenantRole } from "@/lib/runtime/tenant-auth";
import { transitionTenantRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { sendDiscordRuntimeCompletionNotification } from "@/lib/runtime/tenant-runtime-status-notifier";
import { encodeToolContinuationToken } from "@/lib/runtime/tenant-runtime-tools";
import { auditLog } from "@/lib/security/audit";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import { processRuntimeRun } from "@/trigger/process-runtime-run";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; approvalId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantApprovalDecisionRouteParamsSchema,
    errorMessage: "Invalid approval route parameters",
  });
  if (parsedParams instanceof Response) {
    return parsedParams;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for tenant approval decisions",
      fallbackErrorMessage: "Failed to process tenant approval decision",
    },
    async (state) => {
      const parsedBody = tenantApprovalDecisionRequestSchema.safeParse(await request.json());
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid decision payload", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const { data: approval, error } = await state.admin
        .from("tenant_approvals")
        .select("id, status, required_role, request_payload")
        .eq("id", parsedParams.data.approvalId)
        .eq("tenant_id", state.tenantContext.tenantId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!approval) {
        return NextResponse.json({ error: "Approval not found" }, { status: 404 });
      }
      if (approval.status !== "pending") {
        return NextResponse.json(
          { error: "Approval is no longer pending" },
          { status: 409 }
        );
      }

      const requiredRole = approval.required_role as "owner" | "admin" | "operator" | "viewer";
      if (!hasMinimumTenantRole(state.tenantContext.memberRole, requiredRole)) {
        return NextResponse.json(
          { error: "Decision role requirement not met" },
          { status: 403 }
        );
      }

      const nowIso = new Date().toISOString();
      const decision = parsedBody.data.decision;
      const { data: updatedApproval, error: updateError } = await state.admin
        .from("tenant_approvals")
        .update({
          status: decision,
          decided_by: state.user.id,
          decided_at: nowIso,
          decision_payload: {
            decision,
            comment: parsedBody.data.comment || null,
            decided_by: state.user.id,
            decided_at: nowIso,
          },
        })
        .eq("id", parsedParams.data.approvalId)
        .select("id, status, request_payload")
        .single();

      if (updateError || !updatedApproval) {
        throw new Error(updateError?.message || "Failed to update approval");
      }

      const requestPayload =
        updatedApproval.request_payload &&
        typeof updatedApproval.request_payload === "object" &&
        !Array.isArray(updatedApproval.request_payload)
          ? (updatedApproval.request_payload as Record<string, unknown>)
          : {};
      const heartbeatPayload = isHeartbeatApprovalPayload(requestPayload)
        ? (requestPayload as HeartbeatApprovalRequestPayload)
        : null;
      const runId = typeof requestPayload.run_id === "string" ? requestPayload.run_id : null;
      const invocationId =
        typeof requestPayload.invocation_id === "string" ? requestPayload.invocation_id : null;
      const rawContinuationToken =
        typeof requestPayload.continuation_token === "string"
          ? requestPayload.continuation_token
          : null;
      const encodedContinuationToken =
        invocationId && rawContinuationToken
          ? encodeToolContinuationToken({
            invocation_id: invocationId,
            token: rawContinuationToken,
          })
          : null;

      if (heartbeatPayload) {
        if (decision === "approved") {
          const { data: configRow, error: configError } = await state.admin
            .from("tenant_heartbeat_configs")
            .select(
              "id, tenant_id, customer_id, agent_id, enabled, interval_minutes, timezone, active_hours_start, active_hours_end, checks, custom_checks, delivery_channel_id, cooldown_minutes, max_alerts_per_day, digest_enabled, digest_window_minutes, reminder_interval_minutes, heartbeat_instructions, last_run_at, next_run_at"
            )
            .eq("id", heartbeatPayload.config_id)
            .eq("tenant_id", state.tenantContext.tenantId)
            .maybeSingle();

          if (configError) {
            throw new Error(configError.message);
          }

          if (configRow) {
            const config = resolveHeartbeatConfig(configRow as HeartbeatConfigRow);
            if (config.delivery_channel_id) {
              const runtimeRunId = await queueHeartbeatDelivery({
                admin: state.admin,
                config,
                heartbeatRunId: heartbeatPayload.heartbeat_run_id,
                requestTraceId: state.requestTraceId,
                now: new Date(),
                signalSummaries: heartbeatPayload.signal_summaries,
                signalData: heartbeatPayload.signal_data,
                issueContexts: heartbeatPayload.issue_contexts,
              });

              for (const issueContext of heartbeatPayload.issue_contexts) {
                if (typeof issueContext.fingerprint !== "string" || issueContext.fingerprint.length === 0) {
                  continue;
                }

                await state.admin
                  .from("tenant_heartbeat_signals")
                  .update({
                    last_notified_at: nowIso,
                    last_notification_kind: issueContext.attention_type,
                  })
                  .eq("config_id", heartbeatPayload.config_id)
                  .eq("fingerprint", issueContext.fingerprint)
                  .is("resolved_at", null);
              }

              await markHeartbeatRunDeliveryStatus(
                state.admin,
                heartbeatPayload.heartbeat_run_id,
                "queued",
                {
                  approval_ref: {
                    approval_id: updatedApproval.id,
                    approval_reason: heartbeatPayload.approval_reason,
                    decided_at: nowIso,
                    decision,
                    decided_by: state.user.id,
                  },
                },
                null,
                true
              );

              await processRuntimeRun.trigger({ runId: runtimeRunId });
            } else {
              await markHeartbeatRunDeliveryStatus(
                state.admin,
                heartbeatPayload.heartbeat_run_id,
                "suppressed",
                {
                  approval_ref: {
                    approval_id: updatedApproval.id,
                    approval_reason: heartbeatPayload.approval_reason,
                    decided_at: nowIso,
                    decision,
                    decided_by: state.user.id,
                    dispatch_skipped: "missing_delivery_channel",
                  },
                },
                "missing_delivery_channel",
                false
              );
            }
          } else {
            await markHeartbeatRunDeliveryStatus(
              state.admin,
              heartbeatPayload.heartbeat_run_id,
              "suppressed",
              {
                approval_ref: {
                  approval_id: updatedApproval.id,
                  approval_reason: heartbeatPayload.approval_reason,
                  decided_at: nowIso,
                  decision,
                  decided_by: state.user.id,
                  dispatch_skipped: "missing_heartbeat_config",
                },
              },
              "missing_heartbeat_config",
              false
            );
          }
        } else {
          await markHeartbeatRunDeliveryStatus(
            state.admin,
            heartbeatPayload.heartbeat_run_id,
            "suppressed",
            {
              approval_ref: {
                approval_id: updatedApproval.id,
                approval_reason: heartbeatPayload.approval_reason,
                decided_at: nowIso,
                decision,
                decided_by: state.user.id,
                decision_comment: parsedBody.data.comment || null,
              },
            },
            "heartbeat_approval_rejected",
            false
          );
        }
      }

      if (invocationId) {
        await state.admin
          .from("tenant_tool_invocations")
          .update({
            status: decision === "approved" ? "approved" : "rejected",
            result_payload: {
              approval_id: updatedApproval.id,
              decision,
              continuation_token: encodedContinuationToken,
            },
            completed_at: decision === "rejected" ? nowIso : null,
            error_message:
              decision === "rejected"
                ? parsedBody.data.comment || "Tool invocation rejected"
                : null,
          })
          .eq("id", invocationId)
          .eq("tenant_id", state.tenantContext.tenantId);
      }

      if (runId) {
        const { data: runRow } = await state.admin
          .from("tenant_runtime_runs")
          .select("*")
          .eq("id", runId)
          .eq("tenant_id", state.tenantContext.tenantId)
          .maybeSingle();

        if (runRow) {
          const run = runRow as unknown as TenantRuntimeRun;
          if (decision === "approved" && run.status === "awaiting_approval") {
            await transitionTenantRuntimeRun(state.admin, run, "retry", {
              workerId: null,
              lockExpiresAt: null,
              metadataPatch: {
                resumed_after_approval: true,
                approval_id: updatedApproval.id,
                tool_resume_token: encodedContinuationToken,
                tool_resume_invocation_id: invocationId,
              },
            });
          }

          if (decision === "rejected" && run.status === "awaiting_approval") {
            const failedRun = await transitionTenantRuntimeRun(state.admin, run, "fail", {
              workerId: null,
              errorMessage: parsedBody.data.comment || "Rejected via tenant approval queue",
              metadataPatch: {
                approval_rejected: true,
                approval_id: updatedApproval.id,
              },
            });
            await sendDiscordRuntimeCompletionNotification(state.admin, failedRun);
          }
        }
      }

      auditLog({
        action:
          decision === "approved"
            ? "tenant.approval.approved"
            : "tenant.approval.rejected",
        actor: state.user.id,
        resource_type: "tenant_approval",
        resource_id: updatedApproval.id,
        details: {
          tenant_id: state.tenantContext.tenantId,
          run_id: runId,
          invocation_id: invocationId,
        },
      });

      return NextResponse.json({
        approval_id: updatedApproval.id,
        status: decision,
      });
    }
  );
}
