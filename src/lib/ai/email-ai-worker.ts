import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAgentTurnArtifacts, runAgentTurn } from "./agent-turn-runner";
import { assembleEmailContext } from "./email-context-assembler";
import { storeOutboundMessage } from "./message-store";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { flushBrowserSessionsForRun } from "./tools/browser";
import { sendEmailResponse } from "@/lib/email/response-sender";
import {
  sendDiscordChannelMessageSequence,
  buildDiscordRuntimeResponseParts,
} from "@/lib/runtime/tenant-runtime-discord";
import { applyQueuedTenantRuntimeNextAction } from "@/lib/runtime/tenant-runtime-next-action";
import { checkTrialAndSpendingBlock } from "./trial-guard";
import type {
  TenantRuntimeWorker,
  TenantRuntimeWorkerContext,
  TenantRuntimeWorkerResult,
} from "@/lib/runtime/tenant-runtime-worker";
import type { TenantRole } from "@/types/tenant-runtime";
const DISCORD_CROSS_POST_MAX_LENGTH = 1800;
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";

function getDiscordBotToken(): string | null {
  return process.env[DISCORD_BOT_TOKEN_ENV] || null;
}

export function createEmailAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "email_runtime",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      try {
        // Spending cap + trial expiration check
        const { data: custRow } = await admin
          .from("customers")
          .select("spending_paused_at, trial_ends_at, subscription_status")
          .eq("id", context.run.customer_id)
          .single();

        const trialCheck = checkTrialAndSpendingBlock({
          subscription_status: custRow?.subscription_status,
          trial_ends_at: custRow?.trial_ends_at,
          spending_paused_at: custRow?.spending_paused_at,
        });

        if (trialCheck.blocked) {
          return {
            outcome: "completed",
            result: { paused: true, reason: trialCheck.reason },
          };
        }

        // Extract email payload fields
        const payload = context.run.payload;
        const inboundId = typeof payload.inbound_id === "string" ? payload.inbound_id : "";
        const identityId = typeof payload.identity_id === "string" ? payload.identity_id : "";
        const agentId = typeof payload.agent_id === "string" ? payload.agent_id : null;
        const fromEmail = typeof payload.from_email === "string" ? payload.from_email : "";
        const subject = typeof payload.subject === "string" ? payload.subject : "(no subject)";
        const content = typeof payload.content === "string" ? payload.content : "";
        const threadId = typeof payload.thread_id === "string" ? payload.thread_id : null;
        const sessionId = typeof payload.session_id === "string" ? payload.session_id : "";
        const toEmail = typeof payload.to_email === "string" ? payload.to_email : "";
        const inReplyToMessageId = typeof payload.in_reply_to === "string" ? payload.in_reply_to : null;
        const referencesHeader = typeof payload.references_header === "string" ? payload.references_header : null;

        // Parse attachment data from payload
        const attachments = Array.isArray(payload.attachments)
          ? (payload.attachments as Array<{
              filename: string;
              mimeType: string;
              type: "document" | "image" | "unsupported";
              parsedText: string | null;
              imageUrl: string | null;
              sizeBytes: number;
            }>)
          : [];

        if (!sessionId) {
          return {
            outcome: "failed",
            errorMessage: "Missing session_id in email runtime payload",
            result: { failed: true, reason: "missing_session_id" },
          };
        }

        const actorRole: TenantRole = "operator";
        const nextAction = await applyQueuedTenantRuntimeNextAction(admin, context.run, {
          actorId: null,
        });
        const activeRun = nextAction.run;
        const turn = await runAgentTurn({
          admin,
          context: {
            ...context,
            run: activeRun,
          },
          actorRole,
          actorId: null,
          actorDiscordId: null,
          workerKind: "email_runtime",
          systemPromptAddendum: nextAction.systemPromptAddendum,
          assemble: async ({ delegationConfig }) =>
            assembleEmailContext(admin, {
              tenantId: activeRun.tenant_id,
              customerId: activeRun.customer_id,
              sessionId,
              fromEmail,
              subject,
              bodyText: content,
              attachments,
              agentId: agentId ?? undefined,
              runtimeRun: activeRun,
              actorRole,
              actorId: null,
              actorDiscordId: null,
              delegationConfig,
            }),
        });
        const assembled = turn.assembled;
        const executor = turn.executor;
        const result = turn.result;
        const inputTokens = turn.inputTokens;
        const outputTokens = turn.outputTokens;
        const primaryModelId = turn.primaryModelId;
        const responseText = result.text || "[Pantheon] No response generated.";

        // Store outbound message
        await storeOutboundMessage(admin, {
          tenantId: activeRun.tenant_id,
          customerId: activeRun.customer_id,
          sessionId,
          agentId: assembled.agentId,
          content: responseText,
          tokenCount: inputTokens + outputTokens,
        }).catch((err) => {
          console.error("[email-ai-worker] Failed to store outbound message:", safeErrorMessage(err));
        });

        // Send email response via AgentMail
        const emailResult = await sendEmailResponse(admin, {
          customerId: activeRun.customer_id,
          identityId,
          inboundId,
          sessionId,
          runId: activeRun.id,
          fromEmail: toEmail,
          toEmail: fromEmail,
          subject,
          bodyText: responseText,
          inReplyToMessageId: inReplyToMessageId,
          referencesHeader: referencesHeader,
          threadId,
        });

        // Cross-post summary to Discord (fire-and-forget)
        crossPostToDiscord(admin, activeRun.tenant_id, fromEmail, subject, responseText).catch(
          (err) => {
            console.error("[email-ai-worker] Discord cross-post failed:", safeErrorMessage(err));
          }
        );

        // Update email_inbound status
        await admin
          .from("email_inbound")
          .update({
            status: "ai_responded",
            response_message_id: emailResult.providerMessageId,
            run_id: activeRun.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", inboundId);

        await recordAgentTurnArtifacts({
          admin,
          run: activeRun,
          assembled,
          resolvedTools: turn.resolvedTools,
          executor,
          sessionId,
          modelId: primaryModelId,
          fastModel: turn.fastModel,
          contextWindowTokens: turn.contextWindowTokens,
          startTime: turn.startTime,
          inputTokens,
          outputTokens,
          inputCostPerMillion: turn.primaryInputCost,
          outputCostPerMillion: turn.primaryOutputCost,
          loggerPrefix: "email-ai-worker",
        });

        return {
          outcome: "completed",
          result: {
            ack: "email_ai_response_dispatched",
            model: primaryModelId,
            agent_id: assembled.agentId,
            agent_name: assembled.agentDisplayName,
            session_id: sessionId,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            email_response_message_id: emailResult.providerMessageId,
            request_trace_id: context.requestTraceId,
            processed_at: new Date().toISOString(),
          },
        };
      } catch (error) {
        await flushBrowserSessionsForRun(context.run.id).catch(() => []);
        // Update email_inbound status to failed
        const inboundId = context.run.payload.inbound_id;
        if (typeof inboundId === "string") {
          try {
            await admin
              .from("email_inbound")
              .update({
                status: "ai_failed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", inboundId);
          } catch {
            // Best-effort status update
          }
        }

        return {
          outcome: "failed",
          errorMessage: safeErrorMessage(error, "Email AI worker failed"),
          result: {
            failed: true,
            processed_at: new Date().toISOString(),
          },
        };
      }
    },
  };
}

/**
 * Cross-post email response summary to the tenant's default Discord channel.
 */
async function crossPostToDiscord(
  admin: SupabaseClient,
  tenantId: string,
  fromEmail: string,
  subject: string,
  responseText: string
): Promise<void> {
  const botToken = getDiscordBotToken();
  if (!botToken) return;

  // Find the tenant's default Discord channel from an active channel session
  const { data: channelSession } = await admin
    .from("tenant_sessions")
    .select("external_id")
    .eq("tenant_id", tenantId)
    .eq("session_kind", "channel")
    .eq("status", "active")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!channelSession?.external_id) return;

  const truncated =
    responseText.length > DISCORD_CROSS_POST_MAX_LENGTH
      ? responseText.slice(0, DISCORD_CROSS_POST_MAX_LENGTH) + "..."
      : responseText;

  const discordMessage = `**Email from ${fromEmail}**\n**Re: ${subject}**\n\n${truncated}\n\n_Responded via email_`;
  const parts = buildDiscordRuntimeResponseParts(discordMessage);

  await sendDiscordChannelMessageSequence({
    botToken,
    channelId: channelSession.external_id,
    contents: parts,
  });
}
