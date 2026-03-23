import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { discordCanaryIngressSchema } from "@/lib/validators/tenant-runtime";
import { resolveSession } from "@/lib/ai/session-resolver";
import {
  enqueueDiscordRuntimeRun,
  claimQueuedTenantRuntimeRun,
  getNextQueuedSessionLaneRun,
  transitionTenantRuntimeRun,
} from "@/lib/runtime/tenant-runtime-queue";
import {
  DiscordIngressRoutingError,
  resolveTenantForDiscordIngress,
} from "@/lib/runtime/tenant-runtime-discord-routing";
import { evaluateTenantRuntimeIngressGovernance } from "@/lib/runtime/tenant-runtime-governance";
import { getDiscordGatewayConnectionManager } from "@/lib/runtime/tenant-runtime-discord-gateway";
import { tasks } from "@trigger.dev/sdk";
import type { transcribeVoiceMessage } from "@/trigger/transcribe-voice-message";
import { createTenantAiWorker } from "@/lib/ai/tenant-ai-worker";
import { resolveModels } from "@/lib/ai/model-resolver";
import {
  parseAttachmentsFromPayload,
  isAudioAttachment,
} from "@/lib/ai/attachment-handler";
import { resolveDiscordUserRole } from "@/lib/runtime/tenant-discord-role-resolver";
import { sendDiscordRuntimeTerminalSafetyNet } from "@/lib/runtime/tenant-runtime-status-notifier";
import { executeTenantRuntimeRun } from "@/lib/runtime/tenant-runtime-orchestrator";
import { onRunFailed } from "@/lib/runtime/obligation-coordinator";
import {
  findRecentApprovedChannelApproval,
  isApprovalAckOnlyMessage,
} from "@/lib/runtime/discord-approval-ack";

async function triggerNextSessionLaneRun(run: {
  id: string;
  tenant_id: string;
  session_id?: string | null;
  run_kind: "discord_runtime" | "email_runtime" | "discord_canary" | "discord_heartbeat" | "delegation_runtime" | "discord_follow_up";
}) {
  const admin = createAdminClient();
  const next = await getNextQueuedSessionLaneRun(admin, run).catch(() => null);
  if (!next) {
    return;
  }

  await tasks.trigger("process-runtime-run", { runId: next.id }).catch(() => {});
}

async function isAuthorized(request: Request): Promise<boolean> {
  const expectedTokens = [
    process.env.TENANT_RUNTIME_PROCESSOR_TOKEN,
    process.env.WORKFLOW_RUN_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
    process.env.PANTHEON_BOT_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-tenant-runtime-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!(user && isAdmin(user.email));
}

export async function POST(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = discordCanaryIngressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const match = await resolveTenantForDiscordIngress(admin, {
      guildId: parsed.data.guild_id,
      channelId: parsed.data.channel_id,
      userId: parsed.data.user_id,
    });
    const gateway = getDiscordGatewayConnectionManager();
    gateway.register({
      tenantId: match.tenantId,
      guildId: parsed.data.guild_id,
      shardId: 0,
      intents: [512, 4096],
    });
    const normalized = gateway.normalizeIngressEvent(parsed.data);
    const idempotencyKey = request.headers.get("x-idempotency-key")
      || normalized.dedupe_key;
    const requestTraceId = request.headers.get("x-request-id") || crypto.randomUUID();
    const governance = await evaluateTenantRuntimeIngressGovernance(admin, {
      tenantId: match.tenantId,
      content: parsed.data.content,
      channelId: parsed.data.channel_id,
      userId: parsed.data.user_id,
      runKind: "discord_runtime",
    });
    if (!governance.allowed) {
      return NextResponse.json(
        {
          error: governance.message || "Ingress blocked by runtime governance",
          code: governance.code,
          details: governance.details || null,
          tenant_id: match.tenantId,
        },
        { status: governance.status }
      );
    }

    // Check for audio attachments (voice messages)
    const bodyObj = parsed.data as Record<string, unknown>;
    const attachments = parseAttachmentsFromPayload(bodyObj);
    const audioAttachments = attachments.filter(isAudioAttachment);

    if (audioAttachments.length > 0 && !parsed.data.content.trim()) {
      // Voice-only message — transcribe first, then process
      await tasks.trigger<typeof transcribeVoiceMessage>(
        "transcribe-voice-message",
        {
          audioUrl: audioAttachments[0].url,
          tenantId: match.tenantId,
          customerId: match.customerId,
          channelId: parsed.data.channel_id,
          userId: parsed.data.user_id,
          guildId: parsed.data.guild_id,
          messageId: parsed.data.message_id,
          requestTraceId,
        }
      );

      return NextResponse.json(
        {
          accepted: true,
          tenant_id: match.tenantId,
          customer_id: match.customerId,
          routing_source: match.source,
          mode: "voice_transcription",
        },
        { status: 202 }
      );
    }

    const roleResolution = await resolveDiscordUserRole(admin, match.tenantId, parsed.data.user_id);

    if (isApprovalAckOnlyMessage(parsed.data.content)) {
      const recentApproval = await findRecentApprovedChannelApproval(admin, {
        tenantId: match.tenantId,
        decidedByUserId: roleResolution.userId,
        channelId: parsed.data.channel_id,
      });

      if (recentApproval) {
        return NextResponse.json(
          {
            accepted: true,
            tenant_id: match.tenantId,
            customer_id: match.customerId,
            routing_source: match.source,
            mode: "approval_ack_suppressed",
            approval_id: recentApproval.approvalId,
          },
          { status: 202 }
        );
      }
    }

    const session = await resolveSession(admin, {
      tenantId: match.tenantId,
      customerId: match.customerId,
      channelId: parsed.data.channel_id,
      agentId: null,
      sessionKind: parsed.data.guild_id ? "channel" : "dm",
    });

    const run = await enqueueDiscordRuntimeRun(admin, {
      runKind: "discord_runtime",
      tenantId: match.tenantId,
      customerId: match.customerId,
      sessionId: session.id,
      requestTraceId,
      idempotencyKey,
      payload: {
        ...parsed.data,
        attachments: attachments.length > 0 ? attachments : undefined,
        actor_role: roleResolution.role,
        actor_id: roleResolution.userId,
        actor_discord_id: parsed.data.user_id,
        ingress_received_at: new Date().toISOString(),
        ingress_mode: "discord_runtime",
      },
      metadata: {
        route: "/api/admin/tenants/runtime/discord/ingress",
        auto_routed: true,
        routing_source: match.source,
        gateway_snapshot: gateway.snapshot(),
        dedupe_key: normalized.dedupe_key,
        ingress_channel_id: parsed.data.channel_id,
        ingress_user_id: parsed.data.user_id,
        ingress_content_hash: governance.contentHash,
        estimated_input_tokens: governance.estimatedTokens,
        requested_tool_calls: parsed.data.content.trim().startsWith("/tool ") ? 1 : 0,
        governance_policy: governance.policy,
        governance_snapshot: governance.details || {},
      },
    });

    // Inline processing — execute AI worker directly instead of via Trigger.dev
    const claimedRun = await claimQueuedTenantRuntimeRun(admin, run, "ingress-inline");

    if (!claimedRun) {
      // Race condition — another worker already claimed it, that's fine
      return NextResponse.json(
        { accepted: true, tenant_id: match.tenantId, run_id: run.id },
        { status: 202 }
      );
    }

    try {
      const resolvedModels = await resolveModels(admin, match.tenantId);
      const worker = createTenantAiWorker(admin);
      const outcome = await executeTenantRuntimeRun(admin, worker, claimedRun, {
        requestTraceId,
        resolvedModels,
      });
      await sendDiscordRuntimeTerminalSafetyNet(admin, outcome.run);
      if (outcome.finalStatus === "completed" || outcome.finalStatus === "failed") {
        await triggerNextSessionLaneRun(outcome.run);
      }

      return NextResponse.json(
        {
          accepted: true,
          tenant_id: match.tenantId,
          customer_id: match.customerId,
          routing_source: match.source,
          outcome: outcome.workerOutcome,
          run_id: run.id,
        },
        { status: 200 }
      );
    } catch (workerError) {
      const failedRun = await transitionTenantRuntimeRun(admin, claimedRun, "fail", {
        errorMessage: safeErrorMessage(workerError, "Inline worker execution failed"),
      }).catch(() => null); // Best-effort status update
      if (failedRun) {
        await onRunFailed(
          admin,
          failedRun,
          failedRun.error_message ?? undefined
        ).catch(() => null);
        await sendDiscordRuntimeTerminalSafetyNet(admin, failedRun).catch(() => null);
        await triggerNextSessionLaneRun(failedRun);
      }

      return NextResponse.json(
        {
          accepted: true,
          tenant_id: match.tenantId,
          run_id: run.id,
          outcome: "failed",
          error: safeErrorMessage(workerError, "Worker execution failed"),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof DiscordIngressRoutingError) {
      return NextResponse.json(
        { error: error.message, details: error.details || null },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to route and enqueue Discord ingress") },
      { status: 500 }
    );
  }
}
