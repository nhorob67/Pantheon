import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { getDiscordTokenFromChannelConfig } from "@/lib/channel-token";
import { resolveCanonicalLegacyInstanceForTenant } from "./tenant-agents";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import {
  buildDiscordRuntimeResponseParts,
  buildDiscordCanaryResponseContent,
  DiscordApiError,
  isDiscordCanaryLoopContent,
  sendDiscordChannelMessage,
  sendDiscordChannelMessageSequence,
} from "./tenant-runtime-discord";
import {
  CircuitBreakerOpenError,
  runWithCircuitBreaker,
} from "./tenant-runtime-circuit-breaker";
import { resolveTenantRuntimeGovernancePolicy } from "./tenant-runtime-governance";
import {
  executeTenantToolInvocation,
  parseToolRequestFromContent,
  resumeTenantToolInvocationWithToken,
} from "./tenant-runtime-tools";
import type { TenantRole } from "./tenant-role-policy";

const DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD = 3;
const DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS = 30_000;

export interface TenantRuntimeWorkerContext {
  run: TenantRuntimeRun;
  requestTraceId: string | null;
  resolvedModels?: import("@/lib/ai/model-resolver").ResolvedModels;
}

export interface TenantRuntimeWorkerResult {
  outcome: "completed" | "failed" | "awaiting_approval";
  result: Record<string, unknown>;
  errorMessage?: string;
}

export interface TenantRuntimeWorker {
  kind: TenantRuntimeRun["run_kind"];
  execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult>;
}

export const noOpDiscordCanaryWorker: TenantRuntimeWorker = {
  kind: "discord_canary",
  async execute(context) {
    const payload = context.run.payload;
    return {
      outcome: "completed",
      result: {
        ack: "canary_ok",
        transport: "no_op_worker",
        tenant_id: context.run.tenant_id,
        channel_id:
          typeof payload.channel_id === "string" ? payload.channel_id : null,
        request_trace_id: context.requestTraceId,
        processed_at: new Date().toISOString(),
      },
    };
  },
};

export const noOpDiscordRuntimeWorker: TenantRuntimeWorker = {
  kind: "discord_runtime",
  async execute(context) {
    return {
      outcome: "completed",
      result: {
        ack: "runtime_ok",
        transport: "no_op_worker",
        tenant_id: context.run.tenant_id,
        request_trace_id: context.requestTraceId,
        processed_at: new Date().toISOString(),
      },
    };
  },
};

interface InstanceConfigRow {
  id: string;
  channel_config: unknown;
}

async function resolveTenantDiscordDispatchToken(
  admin: SupabaseClient,
  tenantId: string
): Promise<{ botToken: string; legacyInstanceId: string }> {
  const mapping = await resolveCanonicalLegacyInstanceForTenant(admin, tenantId);
  if (!mapping.instanceId) {
    throw new Error("No active legacy instance mapping available for Discord dispatch");
  }

  const { data, error } = await admin
    .from("instances")
    .select("id, channel_config")
    .eq("id", mapping.instanceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Failed to load legacy instance channel configuration for dispatch");
  }

  const instance = data as InstanceConfigRow;
  const botToken = getDiscordTokenFromChannelConfig(instance.channel_config);

  return {
    botToken,
    legacyInstanceId: instance.id,
  };
}

export function createDiscordCanaryDispatchWorker(
  admin: SupabaseClient
): TenantRuntimeWorker {
  return {
    kind: "discord_canary",
    async execute(context) {
      try {
        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const content = typeof payload.content === "string" ? payload.content : "";
        const inboundMessageId =
          typeof payload.message_id === "string" ? payload.message_id : null;

        if (!channelId) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord channel_id in runtime payload",
            result: {
              dispatch_mode: "discord_api",
              failed: true,
              reason: "missing_channel_id",
            },
          };
        }

        if (!content.trim()) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord content in runtime payload",
            result: {
              dispatch_mode: "discord_api",
              failed: true,
              reason: "missing_content",
            },
          };
        }

        if (isDiscordCanaryLoopContent(content)) {
          return {
            outcome: "completed",
            result: {
              ack: "canary_loop_guard_skip",
              dispatch_mode: "discord_api",
              skipped_dispatch: true,
              reason: "loop_guard",
            },
          };
        }

        const { botToken, legacyInstanceId } = await resolveTenantDiscordDispatchToken(
          admin,
          context.run.tenant_id
        );
        const governance = await resolveTenantRuntimeGovernancePolicy(
          admin,
          context.run.tenant_id
        );
        const outboundContent = buildDiscordCanaryResponseContent(content);
        const timeoutFetch: typeof fetch = async (url, init) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), governance.dispatch_timeout_ms);
          try {
            return await fetch(url, {
              ...init,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }
        };

        const sent = await runWithCircuitBreaker(
          `discord_dispatch:${context.run.tenant_id}`,
          () =>
            sendDiscordChannelMessage(
              {
                botToken,
                channelId,
                content: outboundContent,
                replyToMessageId: inboundMessageId,
              },
              timeoutFetch
            ),
          {
            failureThreshold: DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD,
            cooldownMs: DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS,
          }
        );

        return {
          outcome: "completed",
          result: {
            ack: "canary_dispatched",
            dispatch_mode: "discord_api",
            dispatch_timeout_ms: governance.dispatch_timeout_ms,
            legacy_instance_id: legacyInstanceId,
            dispatched_channel_id: channelId,
            dispatched_message_id: sent.messageId,
            dispatched_status: sent.status,
            request_trace_id: context.requestTraceId,
            processed_at: new Date().toISOString(),
          },
        };
      } catch (error) {
        const rateLimitError = error instanceof DiscordApiError && error.status === 429;
        const retryAfterSeconds =
          error instanceof DiscordApiError ? error.retryAfterSeconds : null;
        return {
          outcome: "failed",
          errorMessage: safeErrorMessage(error, "Discord canary dispatch failed"),
          result: {
            dispatch_mode: "discord_api",
            failed: true,
            circuit_breaker_open: error instanceof CircuitBreakerOpenError,
            circuit_breaker_retry_after_ms:
              error instanceof CircuitBreakerOpenError ? error.retryAfterMs : null,
            discord_status:
              error instanceof DiscordApiError ? error.status : null,
            discord_rate_limited: rateLimitError,
            discord_retry_after_seconds: retryAfterSeconds,
            processed_at: new Date().toISOString(),
          },
        };
      }
    },
  };
}

function buildDiscordRuntimeResponseContent(content: string): string {
  const normalized = content.trim();
  if (!normalized) {
    return "[Pantheon] Received empty runtime content.";
  }
  return `[Pantheon] ${normalized}`;
}

function resolveActorRole(payload: Record<string, unknown>): TenantRole {
  const value = payload.actor_role;
  if (value === "owner" || value === "admin" || value === "operator" || value === "viewer") {
    return value;
  }
  return "viewer";
}

export function createDiscordRuntimeDispatchWorker(
  admin: SupabaseClient
): TenantRuntimeWorker {
  return {
    kind: "discord_runtime",
    async execute(context) {
      try {
        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const content = typeof payload.content === "string" ? payload.content : "";
        const inboundMessageId =
          typeof payload.message_id === "string" ? payload.message_id : null;

        if (!channelId) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord channel_id in runtime payload",
            result: {
              dispatch_mode: "discord_api",
              failed: true,
              reason: "missing_channel_id",
            },
          };
        }

        if (!content.trim()) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord content in runtime payload",
            result: {
              dispatch_mode: "discord_api",
              failed: true,
              reason: "missing_content",
            },
          };
        }

        const { botToken, legacyInstanceId } = await resolveTenantDiscordDispatchToken(
          admin,
          context.run.tenant_id
        );
        const governance = await resolveTenantRuntimeGovernancePolicy(
          admin,
          context.run.tenant_id
        );
        const actorRole = resolveActorRole(payload);
        const actorId =
          typeof payload.actor_id === "string" && payload.actor_id.trim().length > 0
            ? payload.actor_id
            : null;
        const continuationToken =
          typeof context.run.metadata.tool_resume_token === "string"
            ? context.run.metadata.tool_resume_token
            : typeof payload.tool_resume_token === "string"
              ? payload.tool_resume_token
              : null;

        const toolRequest = continuationToken ? null : parseToolRequestFromContent(content);
        const toolOutcome = continuationToken
          ? await resumeTenantToolInvocationWithToken(admin, {
            run: context.run,
            continuationToken,
            actorId,
          })
          : toolRequest
            ? await executeTenantToolInvocation(admin, {
              run: context.run,
              toolRequest,
              actorRole,
              actorId,
            })
            : null;

        if (toolOutcome?.outcome === "awaiting_approval") {
          return {
            outcome: "awaiting_approval",
            result: {
              ...toolOutcome.result,
              dispatch_mode: "discord_api",
              legacy_instance_id: legacyInstanceId,
              processed_at: new Date().toISOString(),
            },
          };
        }

        if (toolOutcome?.outcome === "failed") {
          return {
            outcome: "failed",
            errorMessage: toolOutcome.errorMessage || "Runtime tool execution failed",
            result: {
              ...toolOutcome.result,
              dispatch_mode: "discord_api",
              legacy_instance_id: legacyInstanceId,
              processed_at: new Date().toISOString(),
            },
          };
        }

        const responseBody =
          toolOutcome?.outcome === "completed"
            ? JSON.stringify(toolOutcome.result.tool_output || {}, null, 2)
            : buildDiscordRuntimeResponseContent(content);
        const responseParts = buildDiscordRuntimeResponseParts(responseBody);
        const timeoutFetch: typeof fetch = async (url, init) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), governance.dispatch_timeout_ms);
          try {
            return await fetch(url, {
              ...init,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }
        };

        const sent = await runWithCircuitBreaker(
          `discord_dispatch:${context.run.tenant_id}`,
          () =>
            sendDiscordChannelMessageSequence(
              {
                botToken,
                channelId,
                contents: responseParts,
                replyToMessageId: inboundMessageId,
              },
              timeoutFetch
            ),
          {
            failureThreshold: DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD,
            cooldownMs: DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS,
          }
        );

        return {
          outcome: "completed",
          result: {
            ack: "runtime_dispatched",
            dispatch_mode: "discord_api",
            dispatch_timeout_ms: governance.dispatch_timeout_ms,
            legacy_instance_id: legacyInstanceId,
            dispatched_channel_id: channelId,
            dispatched_message_id: sent.messageIds[sent.messageIds.length - 1] || null,
            dispatched_message_ids: sent.messageIds,
            dispatched_message_parts: sent.partsSent,
            dispatched_status: sent.status,
            request_trace_id: context.requestTraceId,
            processed_at: new Date().toISOString(),
          },
        };
      } catch (error) {
        const rateLimitError = error instanceof DiscordApiError && error.status === 429;
        const retryAfterSeconds =
          error instanceof DiscordApiError ? error.retryAfterSeconds : null;
        return {
          outcome: "failed",
          errorMessage: safeErrorMessage(error, "Discord runtime dispatch failed"),
          result: {
            dispatch_mode: "discord_api",
            failed: true,
            circuit_breaker_open: error instanceof CircuitBreakerOpenError,
            circuit_breaker_retry_after_ms:
              error instanceof CircuitBreakerOpenError ? error.retryAfterMs : null,
            discord_status:
              error instanceof DiscordApiError ? error.status : null,
            discord_rate_limited: rateLimitError,
            discord_retry_after_seconds: retryAfterSeconds,
            processed_at: new Date().toISOString(),
          },
        };
      }
    },
  };
}
