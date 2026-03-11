import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { discordCanaryIngressSchema } from "@/lib/validators/tenant-runtime";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import {
  DiscordIngressRoutingError,
  resolveTenantForDiscordIngress,
} from "@/lib/runtime/tenant-runtime-discord-routing";
import { evaluateTenantRuntimeIngressGovernance } from "@/lib/runtime/tenant-runtime-governance";
import { getDiscordGatewayConnectionManager } from "@/lib/runtime/tenant-runtime-discord-gateway";
import { tasks } from "@trigger.dev/sdk";
import type { processRuntimeRun } from "@/trigger/process-runtime-run";
import type { transcribeVoiceMessage } from "@/trigger/transcribe-voice-message";
import {
  parseAttachmentsFromPayload,
  isAudioAttachment,
} from "@/lib/ai/attachment-handler";
import { resolveDiscordUserRole } from "@/lib/runtime/tenant-discord-role-resolver";

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

    const run = await enqueueDiscordRuntimeRun(admin, {
      runKind: "discord_runtime",
      tenantId: match.tenantId,
      customerId: match.customerId,
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

    // Fire-and-forget: dispatch to Trigger.dev for async processing
    tasks
      .trigger<typeof processRuntimeRun>("process-runtime-run", {
        runId: run.id,
      })
      .catch(() => {
        // Trigger.dev unavailable — run stays queued for polling fallback
      });

    return NextResponse.json(
      {
        accepted: true,
        tenant_id: match.tenantId,
        customer_id: match.customerId,
        routing_source: match.source,
        worker_endpoint: "/api/admin/tenants/runtime/process",
        run,
      },
      { status: 202 }
    );
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
