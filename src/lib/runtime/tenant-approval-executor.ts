import type { SupabaseClient } from "@supabase/supabase-js";
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
import { sendDiscordRuntimeTerminalSafetyNet } from "@/lib/runtime/tenant-runtime-status-notifier";
import { encodeToolContinuationToken } from "@/lib/runtime/tenant-runtime-tools";
import { storeIntegrationCredential } from "@/lib/runtime/tenant-integrations";
import { auditLog } from "@/lib/security/audit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { integrationStoreCredentialSchema } from "@/lib/validators/integration";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import { processRuntimeRun } from "@/trigger/process-runtime-run";
import { updateDiscordApprovalMessage } from "./tenant-approval-discord-notifier";
import {
  DiscordRuntimeReplyOrchestrator,
} from "./discord-runtime-reply-orchestrator";
import { resolveDiscordBotToken } from "./tenant-runtime-discord-lifecycle";
import {
  getObligationById,
  onApprovalGranted,
} from "./obligation-coordinator";
import {
  buildApprovalGrantedReply,
  sendDiscordObligationStatusReply,
} from "./obligation-discord-notifier";

export interface ExecuteTenantApprovalDecisionInput {
  tenantId: string;
  approvalId: string;
  decidedByUserId: string;
  decidedByRole: "owner" | "admin" | "operator" | "viewer";
  decision: "approved" | "rejected";
  comment?: string;
  requestTraceId: string;
}

export type ExecuteTenantApprovalDecisionResult =
  | { ok: true; approval_id: string; status: string }
  | { ok: false; error: string; httpStatus: number };

interface ApprovedToolExecutionOutcome {
  completed: boolean;
  toolKey: string;
  resultSummary?: string;
  error?: string;
}

async function emitDiscordApprovalLifecycle(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  input:
    | { kind: "granted"; approvalId: string }
    | { kind: "rejected"; reason?: string | null }
): Promise<boolean> {
  const channelId =
    typeof run.payload.channel_id === "string" ? run.payload.channel_id.trim() : "";
  const replyToMessageId =
    typeof run.payload.message_id === "string" ? run.payload.message_id : null;
  const botToken = await resolveDiscordBotToken(admin, run.tenant_id);

  if (!channelId || !botToken) {
    return false;
  }

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin,
    run,
    botToken,
    channelId,
    replyToMessageId,
  });

  if (input.kind === "granted") {
    return orchestrator.emitApprovalGranted({
      approvalId: input.approvalId,
    });
  }

  const result = await orchestrator.finalizeFailure(input.reason ?? run.error_message);
  return result.finalReplySent;
}

async function executeApprovedToolIfNeeded(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    requestPayload: Record<string, unknown>;
  }
): Promise<ApprovedToolExecutionOutcome | null> {
  const toolKey =
    typeof input.requestPayload.tool_key === "string"
      ? input.requestPayload.tool_key
      : null;

  if (!toolKey) {
    return null;
  }

  const args =
    typeof input.requestPayload.args === "object" &&
    input.requestPayload.args !== null &&
    !Array.isArray(input.requestPayload.args)
      ? (input.requestPayload.args as Record<string, unknown>)
      : null;

  if (toolKey !== "integration_store_credential" || !args) {
    return null;
  }

  const parsedArgs = integrationStoreCredentialSchema.safeParse(args);
  if (!parsedArgs.success) {
    return {
      completed: false,
      toolKey,
      error: "Saved credential approval payload was invalid.",
    };
  }

  const customerId =
    typeof input.requestPayload.customer_id === "string" && input.requestPayload.customer_id.length > 0
      ? input.requestPayload.customer_id
      : null;
  if (!customerId) {
    return {
      completed: false,
      toolKey,
      error: "Saved credential approval payload was missing customer_id.",
    };
  }

  try {
    const result = await storeIntegrationCredential({
      admin,
      tenantId: input.tenantId,
      customerId,
      agentId:
        typeof input.requestPayload.agent_id === "string"
          ? input.requestPayload.agent_id
          : null,
      serviceSlug: parsedArgs.data.service_slug,
      apiKey: parsedArgs.data.api_key,
      authMethod: parsedArgs.data.auth_method,
      authHeader: parsedArgs.data.auth_header,
      metadata: parsedArgs.data.metadata,
    });

    return {
      completed: true,
      toolKey,
      resultSummary: JSON.stringify({
        success: true,
        secret_id: result.secret_id,
        label: result.label,
        hint: result.value_hint,
      }),
    };
  } catch (error) {
    return {
      completed: false,
      toolKey,
      error: safeErrorMessage(error, "Approved tool execution failed"),
    };
  }
}

export async function executeTenantApprovalDecision(
  admin: SupabaseClient,
  input: ExecuteTenantApprovalDecisionInput
): Promise<ExecuteTenantApprovalDecisionResult> {
  const { data: approval, error } = await admin
    .from("tenant_approvals")
    .select("id, status, required_role, request_payload, discord_message_id, discord_channel_id")
    .eq("id", input.approvalId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, httpStatus: 500 };
  }
  if (!approval) {
    return { ok: false, error: "Approval not found", httpStatus: 404 };
  }
  if (approval.status !== "pending") {
    return { ok: false, error: "Approval is no longer pending", httpStatus: 409 };
  }

  const requiredRole = approval.required_role as "owner" | "admin" | "operator" | "viewer";
  if (!hasMinimumTenantRole(input.decidedByRole, requiredRole)) {
    return { ok: false, error: "Decision role requirement not met", httpStatus: 403 };
  }

  const nowIso = new Date().toISOString();
  const decision = input.decision;
  const { data: updatedApproval, error: updateError } = await admin
    .from("tenant_approvals")
    .update({
      status: decision,
      decided_by: input.decidedByUserId,
      decided_at: nowIso,
      decision_payload: {
        decision,
        comment: input.comment || null,
        decided_by: input.decidedByUserId,
        decided_at: nowIso,
      },
    })
    .eq("id", input.approvalId)
    .select("id, status, request_payload")
    .single();

  if (updateError || !updatedApproval) {
    return { ok: false, error: updateError?.message || "Failed to update approval", httpStatus: 500 };
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
  const approvedToolExecution =
    decision === "approved"
      ? await executeApprovedToolIfNeeded(admin, {
          tenantId: input.tenantId,
          requestPayload,
        })
      : null;

  if (approvedToolExecution) {
    const decisionPayload = {
      decision,
      comment: input.comment || null,
      decided_by: input.decidedByUserId,
      decided_at: nowIso,
      tool_execution: approvedToolExecution.completed
        ? {
            tool_key: approvedToolExecution.toolKey,
            status: "completed",
            result_summary: approvedToolExecution.resultSummary ?? null,
          }
        : {
            tool_key: approvedToolExecution.toolKey,
            status: "failed",
            error: approvedToolExecution.error ?? "Approved tool execution failed",
          },
    };

    await admin
      .from("tenant_approvals")
      .update({ decision_payload: decisionPayload })
      .eq("id", input.approvalId);
  }

  if (heartbeatPayload) {
    if (decision === "approved") {
      const { data: configRow, error: configError } = await admin
        .from("tenant_heartbeat_configs")
        .select(
          "id, tenant_id, customer_id, agent_id, enabled, interval_minutes, timezone, active_hours_start, active_hours_end, checks, custom_checks, delivery_channel_id, cooldown_minutes, max_alerts_per_day, digest_enabled, digest_window_minutes, reminder_interval_minutes, heartbeat_instructions, last_run_at, next_run_at"
        )
        .eq("id", heartbeatPayload.config_id)
        .eq("tenant_id", input.tenantId)
        .maybeSingle();

      if (configError) {
        return { ok: false, error: configError.message, httpStatus: 500 };
      }

      if (configRow) {
        const config = resolveHeartbeatConfig(configRow as HeartbeatConfigRow);
        if (config.delivery_channel_id) {
          const runtimeRunId = await queueHeartbeatDelivery({
            admin,
            config,
            heartbeatRunId: heartbeatPayload.heartbeat_run_id,
            requestTraceId: input.requestTraceId,
            now: new Date(),
            signalSummaries: heartbeatPayload.signal_summaries,
            signalData: heartbeatPayload.signal_data,
            issueContexts: heartbeatPayload.issue_contexts,
          });

          for (const issueContext of heartbeatPayload.issue_contexts) {
            if (typeof issueContext.fingerprint !== "string" || issueContext.fingerprint.length === 0) {
              continue;
            }

            await admin
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
            admin,
            heartbeatPayload.heartbeat_run_id,
            "queued",
            {
              approval_ref: {
                approval_id: updatedApproval.id,
                approval_reason: heartbeatPayload.approval_reason,
                decided_at: nowIso,
                decision,
                decided_by: input.decidedByUserId,
              },
            },
            null,
            true
          );

          await processRuntimeRun.trigger({ runId: runtimeRunId }).catch((err) => {
            console.error("[approval-executor] Failed to trigger heartbeat runtime run:", err instanceof Error ? err.message : "unknown");
          });
        } else {
          await markHeartbeatRunDeliveryStatus(
            admin,
            heartbeatPayload.heartbeat_run_id,
            "suppressed",
            {
              approval_ref: {
                approval_id: updatedApproval.id,
                approval_reason: heartbeatPayload.approval_reason,
                decided_at: nowIso,
                decision,
                decided_by: input.decidedByUserId,
                dispatch_skipped: "missing_delivery_channel",
              },
            },
            "missing_delivery_channel",
            false
          );
        }
      } else {
        await markHeartbeatRunDeliveryStatus(
          admin,
          heartbeatPayload.heartbeat_run_id,
          "suppressed",
          {
            approval_ref: {
              approval_id: updatedApproval.id,
              approval_reason: heartbeatPayload.approval_reason,
              decided_at: nowIso,
              decision,
              decided_by: input.decidedByUserId,
              dispatch_skipped: "missing_heartbeat_config",
            },
          },
          "missing_heartbeat_config",
          false
        );
      }
    } else {
      await markHeartbeatRunDeliveryStatus(
        admin,
        heartbeatPayload.heartbeat_run_id,
        "suppressed",
        {
          approval_ref: {
            approval_id: updatedApproval.id,
            approval_reason: heartbeatPayload.approval_reason,
            decided_at: nowIso,
            decision,
            decided_by: input.decidedByUserId,
            decision_comment: input.comment || null,
          },
        },
        "heartbeat_approval_rejected",
        false
      );
    }
  }

  if (invocationId) {
    await admin
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
            ? input.comment || "Tool invocation rejected"
            : null,
      })
      .eq("id", invocationId)
      .eq("tenant_id", input.tenantId);
  }

  if (runId) {
    const approvalRequestPayload =
      updatedApproval.request_payload &&
      typeof updatedApproval.request_payload === "object" &&
      !Array.isArray(updatedApproval.request_payload)
        ? (updatedApproval.request_payload as Record<string, unknown>)
        : {};
    const obligationId =
      typeof approvalRequestPayload.obligation_id === "string"
        ? approvalRequestPayload.obligation_id
        : null;
    const obligationResumeToken =
      typeof approvalRequestPayload.obligation_resume_token === "string"
        ? approvalRequestPayload.obligation_resume_token
        : null;
    const { data: runRow } = await admin
      .from("tenant_runtime_runs")
      .select("*")
      .eq("id", runId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle();

    if (runRow) {
      const run = runRow as unknown as TenantRuntimeRun;
      if (decision === "approved" && run.status === "awaiting_approval") {
        const resumedRun = await transitionTenantRuntimeRun(admin, run, "retry", {
          workerId: null,
          lockExpiresAt: null,
          metadataPatch: {
            resumed_after_approval: true,
            approval_id: updatedApproval.id,
            tool_resume_token: encodedContinuationToken,
            tool_resume_invocation_id: invocationId,
            approved_tool_execution: approvedToolExecution
              ? {
                  tool_key: approvedToolExecution.toolKey,
                  status: approvedToolExecution.completed ? "completed" : "failed",
                  execution_mode: "server",
                  result_summary: approvedToolExecution.resultSummary ?? null,
                  error: approvedToolExecution.error ?? null,
                }
              : null,
          },
        });
        if (obligationId) {
          const obligation = await getObligationById(admin, obligationId).catch(() => null);
          const tokenMatches =
            !obligationResumeToken ||
            (obligation?.resume_token !== null &&
              obligation?.resume_token === obligationResumeToken);

          if (obligation && tokenMatches) {
            const updatedObligation = await onApprovalGranted(
              admin,
              obligation.id,
              updatedApproval.id,
              resumedRun.id
            ).catch(() => null);

            if (updatedObligation) {
              const sentViaOrchestrator = await emitDiscordApprovalLifecycle(
                admin,
                resumedRun,
                {
                  kind: "granted",
                  approvalId: updatedApproval.id,
                }
              ).catch(() => false);
              if (!sentViaOrchestrator) {
                await sendDiscordObligationStatusReply(admin, updatedObligation, {
                  content: buildApprovalGrantedReply(),
                  runId: resumedRun.id,
                  eventType: "approval_granted",
                }).catch(() => false);
              }
            }
          }
        }
        await processRuntimeRun.trigger({ runId: run.id }).catch((err) => {
          console.error("[approval-executor] Failed to trigger runtime run after approval:", err instanceof Error ? err.message : "unknown");
        });
      }

      if (decision === "rejected" && run.status === "awaiting_approval") {
        const failedRun = await transitionTenantRuntimeRun(admin, run, "fail", {
          workerId: null,
          errorMessage: input.comment || "Rejected via tenant approval queue",
          metadataPatch: {
            approval_rejected: true,
            approval_id: updatedApproval.id,
          },
        });
        await sendDiscordRuntimeTerminalSafetyNet(admin, failedRun).catch((err) => {
          console.error("[approval-executor] Failed to send rejection notification:", err instanceof Error ? err.message : "unknown");
        });
      }
    }
  }

  // Edit the Discord button message if one was sent
  if (approval.discord_message_id && approval.discord_channel_id) {
    const botToken = await resolveDiscordBotToken(admin, input.tenantId);
    if (botToken) {
      updateDiscordApprovalMessage({
        botToken,
        channelId: approval.discord_channel_id,
        messageId: approval.discord_message_id,
        decision,
        decidedBy: input.decidedByUserId,
      }).catch(() => {
        // Non-critical — the web dashboard decision still succeeded
      });
    }
  }

  auditLog({
    action:
      decision === "approved"
        ? "tenant.approval.approved"
        : "tenant.approval.rejected",
    actor: input.decidedByUserId,
    resource_type: "tenant_approval",
    resource_id: updatedApproval.id,
    details: {
      tenant_id: input.tenantId,
      run_id: runId,
      invocation_id: invocationId,
    },
  });

  return {
    ok: true,
    approval_id: updatedApproval.id,
    status: decision,
  };
}
