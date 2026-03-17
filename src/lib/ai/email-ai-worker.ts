import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./client";
import { estimateTokenUsageCostCents, recordTokenUsage } from "./usage-tracker";
import { resolveWorkerModels } from "./model-resolver";
import { assembleEmailContext } from "./email-context-assembler";
import { storeOutboundMessage } from "./message-store";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { maybeGenerateSummary } from "./session-summarizer";
import { extractBehavioralPatterns } from "./procedural-memory";
import { recordConversationTrace, extractWebCitations, extractDelegationEvents } from "./trace-recorder";
import { flushBrowserSessionsForRun } from "./tools/browser";
import {
  createUnifiedToolExecutor,
  registerComposioToolKeyMappings,
  registerMcpToolKeyMappings,
} from "@/lib/runtime/unified-tool-executor";
import { loadGuardrailConfig, loadMiddlewareRateLimits } from "@/lib/runtime/guardrail-config-loader";
import { createDefaultGuardrailPipeline } from "@/lib/runtime/guardrail-middleware";
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

        const startTime = Date.now();
        const actorRole: TenantRole = "operator";
        // Mutable delegation context — parentGuardrails/parentRecords/parentToolKeys
        // are populated after executor creation, before any delegation tool executes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const delegationCtx: any = {
          currentDepth: 0,
          parentRun: context.run,
          actorRole,
          actorId: null,
          actorDiscordId: null,
          workerKind: "email_runtime" as const,
          resolvedModels: context.resolvedModels,
        };

        // Assemble context: agent, memory, knowledge, tools, history
        const assembled = await assembleEmailContext(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId,
          fromEmail,
          subject,
          bodyText: content,
          attachments,
          agentId: agentId ?? undefined,
          runtimeRun: context.run,
          actorRole,
          actorId: null,
          actorDiscordId: null,
          delegationConfig: delegationCtx,
        });

        // Wrap tools with unified executor (policy enforced: denied/approval-required tools blocked)
        const agentAutonomy = assembled.agent?.config?.autonomy_level;
        const [guardrailConfig, middlewareRateLimits] = await Promise.all([
          loadGuardrailConfig(admin, context.run.tenant_id, assembled.agentId),
          loadMiddlewareRateLimits(admin, context.run.tenant_id, assembled.agentId),
        ]);
        const middlewarePipeline = createDefaultGuardrailPipeline(middlewareRateLimits);
        const executor = createUnifiedToolExecutor({
          admin,
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          agentId: assembled.agentId,
          run: context.run,
          actorRole,
          actorId: null,
          workerKind: "email_runtime",
          enforcePolicy: true,
          agentAutonomyLevel:
            agentAutonomy === "assisted" || agentAutonomy === "copilot" || agentAutonomy === "autopilot"
              ? agentAutonomy
              : undefined,
          guardrailConfig,
          middlewarePipeline,
        });
        // Register Composio key mappings so the unified executor can resolve
        // model-facing names to policy keys
        if (assembled.composioKeyMap && assembled.composioKeyMap.size > 0) {
          registerComposioToolKeyMappings(assembled.composioKeyMap);
        }
        if (assembled.mcpKeyMap && assembled.mcpKeyMap.size > 0) {
          registerMcpToolKeyMappings(assembled.mcpKeyMap);
        }

        delegationCtx.parentGuardrails = executor.guardrails;
        delegationCtx.parentRecords = executor.records as unknown[];
        delegationCtx.parentToolKeys = new Set(Object.keys(assembled.tools));

        const instrumentedTools = executor.wrapAll(assembled.tools);

        const hasTools = Object.keys(instrumentedTools).length > 0;
        const result = await generateText({
          model: primaryModel,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          temperature: AI_CONFIG.temperature,
          system: assembled.systemPrompt,
          messages: assembled.messages,
          ...(hasTools ? { tools: instrumentedTools, maxSteps: 5 } : {}),
        });

        const inputTokens = result.usage?.inputTokens ?? 0;
        const outputTokens = result.usage?.outputTokens ?? 0;
        const estimatedCostCents = estimateTokenUsageCostCents({
          model: primaryModelId,
          inputTokens,
          outputTokens,
          inputCostPerMillion: primaryInputCost,
          outputCostPerMillion: primaryOutputCost,
        });
        const usageGuardrailEvent = executor.guardrails?.recordTokenUsage(
          inputTokens,
          outputTokens,
          estimatedCostCents
        );
        if (usageGuardrailEvent?.action === "halt") {
          console.warn(`[email-ai-worker] Guardrail halt after model usage: ${usageGuardrailEvent.message}`);
        }

        const responseText = result.text || "[Pantheon] No response generated.";

        // Store outbound message
        await storeOutboundMessage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId,
          agentId: assembled.agentId,
          content: responseText,
          tokenCount: inputTokens + outputTokens,
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
            agentId: assembled.agentId ?? undefined,
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

        // Fire-and-forget: flush unified tool executor (invocations + telemetry)
        executor.flush().catch((err) => {
          console.error("[email-ai-worker] Unified executor flush failed:", safeErrorMessage(err));
        });

        // Fire-and-forget: conversation trace
        const totalLatencyMs = Date.now() - startTime;
        const browserSessions = await flushBrowserSessionsForRun(context.run.id);
        recordConversationTrace(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId,
          runId: context.run.id,
          agentId: assembled.agentId,
          agentName: assembled.agentDisplayName,
          toolsAvailable: Object.keys(assembled.tools),
          toolsInvoked: executor.records.map((r) => ({
            name: r.toolName,
            input_summary: r.inputSummary,
            output_summary: r.success ? r.outputSummary : `error: ${r.errorClass}`,
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
          webCitations: extractWebCitations(executor.records),
          delegationEvents: extractDelegationEvents(
            executor.records,
            assembled.agentId ?? "unknown",
            assembled.agentDisplayName
          ),
          browserSessions: browserSessions.map((session) => ({
            session_id: session.sessionId,
            action_count: session.actionCount,
            duration_ms: session.durationMs,
            status: session.status,
            urls_visited: session.urlsVisited,
            artifact_count: session.artifactCount,
          })),
          modelId: primaryModelId,
          inputTokens,
          outputTokens,
          totalLatencyMs,
          guardrailSummary: executor.guardrails?.getSummary() ?? null,
        }).catch((err) => {
          console.error("[email-ai-worker] Trace recording failed:", safeErrorMessage(err));
        });

        // Record token usage for billing
        await recordTokenUsage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          model: primaryModelId,
          inputTokens,
          outputTokens,
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
