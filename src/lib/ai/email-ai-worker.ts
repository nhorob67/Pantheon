import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./client";
import { recordTokenUsage } from "./usage-tracker";
import { resolveWorkerModels } from "./model-resolver";
import { assembleEmailContext } from "./email-context-assembler";
import { storeOutboundMessage } from "./message-store";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { maybeGenerateSummary } from "./session-summarizer";
import { extractBehavioralPatterns } from "./procedural-memory";
import { recordConversationTrace } from "./trace-recorder";
import { sendEmailResponse } from "@/lib/email/response-sender";
import {
  sendDiscordChannelMessageSequence,
  buildDiscordRuntimeResponseParts,
} from "@/lib/runtime/tenant-runtime-discord";
import { checkTrialAndSpendingBlock } from "./trial-guard";
import type {
  TenantRuntimeWorker,
  TenantRuntimeWorkerContext,
  TenantRuntimeWorkerResult,
} from "@/lib/runtime/tenant-runtime-worker";
const DISCORD_CROSS_POST_MAX_LENGTH = 1800;
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";

function getDiscordBotToken(): string | null {
  return process.env[DISCORD_BOT_TOKEN_ENV] || null;
}

export function createEmailAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "email_runtime",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      const { model: primaryModel, modelId: primaryModelId, inputCost: primaryInputCost, outputCost: primaryOutputCost, fastModel } = resolveWorkerModels(context.resolvedModels);
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

        const startTime = Date.now();

        // Assemble context: agent, memory, knowledge, tools, history
        const assembled = await assembleEmailContext(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId,
          fromEmail,
          subject,
          bodyText: content,
          attachments,
        });

        const hasTools = Object.keys(assembled.tools).length > 0;
        const result = await generateText({
          model: primaryModel,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          temperature: AI_CONFIG.temperature,
          system: assembled.systemPrompt,
          messages: assembled.messages,
          ...(hasTools ? { tools: assembled.tools, maxSteps: 5 } : {}),
        });

        const responseText = result.text || "[Pantheon] No response generated.";

        // Store outbound message
        await storeOutboundMessage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId,
          agentId: assembled.agentId,
          content: responseText,
          tokenCount: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
        }).catch((err) => {
          console.error("[email-ai-worker] Failed to store outbound message:", safeErrorMessage(err));
        });

        // Send email response via AgentMail
        const emailResult = await sendEmailResponse(admin, {
          customerId: context.run.customer_id,
          identityId,
          inboundId,
          sessionId,
          runId: context.run.id,
          fromEmail: toEmail,
          toEmail: fromEmail,
          subject,
          bodyText: responseText,
          inReplyToMessageId: inReplyToMessageId,
          referencesHeader: referencesHeader,
          threadId,
        });

        // Cross-post summary to Discord (fire-and-forget)
        crossPostToDiscord(admin, context.run.tenant_id, fromEmail, subject, responseText).catch(
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
            run_id: context.run.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", inboundId);

        // Fire-and-forget: session summarization
        if (assembled.memorySettings.autoCompress) {
          maybeGenerateSummary({
            admin,
            tenantId: context.run.tenant_id,
            customerId: context.run.customer_id,
            sessionId,
            captureLevel: assembled.memorySettings.captureLevel,
            excludeCategories: assembled.memorySettings.excludeCategories,
            model: fastModel,
          }).catch((err) => {
            console.error("[email-ai-worker] Session summarization failed:", safeErrorMessage(err));
          });
        }

        // Fire-and-forget: behavioral pattern extraction
        extractBehavioralPatterns(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId,
          recentMessages: assembled.messages
            .filter((m) => "role" in m && (m.role === "user" || m.role === "assistant"))
            .map((m) => ({
              role: "role" in m ? String(m.role) : "user",
              content: "content" in m && typeof m.content === "string" ? m.content : "",
            })),
          existingPatterns: [],
          model: fastModel,
        }).catch((err) => {
          console.error("[email-ai-worker] Pattern extraction failed:", safeErrorMessage(err));
        });

        // Fire-and-forget: conversation trace
        const totalLatencyMs = Date.now() - startTime;
        const toolCalls = result.toolCalls || [];
        recordConversationTrace(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId,
          runId: context.run.id,
          agentId: assembled.agentId,
          agentName: assembled.agentDisplayName,
          toolsAvailable: Object.keys(assembled.tools),
          toolsInvoked: toolCalls.map((tc) => ({
            name: tc.toolName,
            input_summary: JSON.stringify("args" in tc ? tc.args : {}).slice(0, 200),
            output_summary: "",
          })),
          memoriesReferenced: assembled.memoryIds?.map((id) => ({
            id,
            content_preview: "",
            score: 0,
          })) || [],
          knowledgeReferenced: assembled.knowledgeIds?.map((id) => ({
            id,
            source: "",
            chunk_preview: "",
          })) || [],
          modelId: primaryModelId,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          totalLatencyMs,
        }).catch((err) => {
          console.error("[email-ai-worker] Trace recording failed:", safeErrorMessage(err));
        });

        // Record token usage for billing
        await recordTokenUsage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          model: primaryModelId,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          inputCostPerMillion: primaryInputCost,
          outputCostPerMillion: primaryOutputCost,
        }).catch((err) => {
          console.error("[email-ai-worker] Failed to record usage:", safeErrorMessage(err));
        });

        return {
          outcome: "completed",
          result: {
            ack: "email_ai_response_dispatched",
            model: primaryModelId,
            agent_id: assembled.agentId,
            agent_name: assembled.agentDisplayName,
            session_id: sessionId,
            input_tokens: result.usage?.inputTokens ?? 0,
            output_tokens: result.usage?.outputTokens ?? 0,
            email_response_message_id: emailResult.providerMessageId,
            request_trace_id: context.requestTraceId,
            processed_at: new Date().toISOString(),
          },
        };
      } catch (error) {
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
