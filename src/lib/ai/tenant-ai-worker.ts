import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAgentTurnArtifacts, runAgentTurn } from "./agent-turn-runner";
import { assembleContext } from "./context-assembler";
import { storeOutboundMessage } from "./message-store";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { parseAttachmentsFromPayload, isImageAttachment } from "./attachment-handler";
import {
  formatActionFallback,
  formatInformationalFallback,
  getToolStatusKey,
  getToolStatusMessage,
  isGenericInformationalResponse,
} from "./fallback-formatter";
import { flushBrowserSessionsForRun } from "./tools/browser";
import {
  DiscordApiError,
} from "@/lib/runtime/tenant-runtime-discord";
import { clearPendingFiles, peekPendingFiles } from "./tools/file-create";
import { scheduleFollowUp, MAX_FOLLOW_UP_DEPTH } from "./tools/follow-up";
import {
  getObligationById,
  getObligationByRunId,
  recordObligationHeartbeat,
  recordObligationToolPhase,
  recordUserUpdate,
} from "@/lib/runtime/obligation-coordinator";
import {
  CircuitBreakerOpenError,
} from "@/lib/runtime/tenant-runtime-circuit-breaker";
import {
  dispatchDiscordRuntimeTerminalSuccess,
  dispatchDiscordRuntimeTerminalFailure,
  DiscordRuntimeReplyOrchestrator,
} from "@/lib/runtime/discord-runtime-reply-orchestrator";
import { chunkReplyContent, FRIENDLY_TOOL_SUMMARY_MESSAGES } from "@/lib/runtime/discord-runtime-reply-policy";
import { resolveDiscordBotToken } from "@/lib/runtime/tenant-runtime-discord-lifecycle";
import { checkTrialAndSpendingBlock } from "./trial-guard";
import { buildRedactor } from "@/lib/secrets/redaction";
import { resolveTenantRuntimeGovernancePolicy } from "@/lib/runtime/tenant-runtime-governance";
import {
  applyQueuedTenantRuntimeNextAction,
  extractApprovalIdFromExecutorRecords,
} from "@/lib/runtime/tenant-runtime-next-action";
import type {
  TenantRuntimeWorker,
  TenantRuntimeWorkerContext,
  TenantRuntimeWorkerResult,
} from "@/lib/runtime/tenant-runtime-worker";
import type { RuntimeObligation } from "@/types/obligation";
import type { TenantRole } from "@/types/tenant-runtime";

import {
  isQueryLikeToolRecord,
  formatQueryToolOutput,
  isGenericQueryResponse,
} from "./query-output-formatter";
import {
  shouldSuppressIntermediateToolPreamble,
  extractWorkerLifecycleToolEvents,
} from "./worker-lifecycle-events";
import { buildFollowUpPrompt, buildCronPrompt } from "./specialized-prompts";
import { resolveRunTerminalState } from "./run-terminal-state";
import type { RunTerminalState } from "./run-terminal-state";
import { shouldScheduleStructuralFollowUp } from "./follow-up-orchestrator";
import {
  PROGRESS_HEARTBEAT_INTERVAL_MS,
  TYPING_REFRESH_INTERVAL_MS,
  LONG_TASK_PROGRESS_UPDATE_MS,
  OBLIGATION_HEARTBEAT_UPDATE_MS,
  MAX_AUTOMATED_PROGRESS_UPDATES,
  APPROVAL_REQUIRED_REPLY,
  getContextualProgressMessage,
} from "./discord-progress-manager";

function resolveActorRole(payload: Record<string, unknown>): TenantRole {
  const value = payload.actor_role;
  if (value === "owner" || value === "admin" || value === "operator" || value === "viewer") {
    return value;
  }
  return "viewer";
}

export function createTenantAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "discord_runtime",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      let replyOrchestrator: DiscordRuntimeReplyOrchestrator | null = null;
      try {
        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const content = typeof payload.content === "string" ? payload.content : "";
        const rawMessageId =
          typeof payload.message_id === "string" ? payload.message_id : null;
        // Cron/system runs use synthetic message IDs (e.g. "cron-...") that are
        // not valid Discord snowflakes. Passing them as a message_reference
        // causes "Invalid Form Body" from the Discord API, so strip them.
        const inboundMessageId =
          rawMessageId && /^\d+$/.test(rawMessageId) ? rawMessageId : null;

        // Spending cap + trial expiration circuit breaker
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
          if (channelId && trialCheck.message) {
            await dispatchDiscordRuntimeTerminalFailure(admin, context.run, {
              channelId,
              replyToMessageId: inboundMessageId,
              errorMessage: trialCheck.message,
            }).catch(() => {});
          }

          return {
            outcome: "completed",
            result: { paused: true, reason: trialCheck.reason },
          };
        }

        const userId =
          typeof payload.user_id === "string" ? payload.user_id : "unknown";
        const guildId =
          typeof payload.guild_id === "string" ? payload.guild_id : null;
        const actorRole = resolveActorRole(payload);
        const actorId = typeof payload.actor_id === "string" ? payload.actor_id : null;
        const actorDiscordId = typeof payload.actor_discord_id === "string" ? payload.actor_discord_id : null;

        if (!channelId) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord channel_id in runtime payload",
            result: { failed: true, reason: "missing_channel_id" },
          };
        }

        // Cron messages have synthetic content — replace with a prompt
        const isCron = typeof payload.run_kind === "string" && payload.run_kind === "discord_cron";
        const isFollowUp = typeof payload.run_kind === "string" && payload.run_kind === "discord_follow_up";
        const scheduleKey = typeof payload.schedule_key === "string" ? payload.schedule_key : null;

        // For follow-ups: separate retrieval, stored history, and system prompt concerns
        const followUpPrompt = isFollowUp ? buildFollowUpPrompt(payload) : null;
        const followUpRetrievalQuery = isFollowUp
          ? [
              typeof payload.task_summary === "string" ? payload.task_summary : "",
              typeof payload.reason === "string" ? payload.reason : "",
            ].filter(Boolean).join(" — ") || undefined
          : undefined;

        const userContent = isCron
          ? buildCronPrompt(scheduleKey, payload)
          : isFollowUp
            ? "[follow-up check-in]"
            : content;

        // Parse attachments from payload
        const attachments = parseAttachmentsFromPayload(payload);
        const imageAttachments = attachments.filter(isImageAttachment);
        const hasAttachments = attachments.length > 0;

        if (!userContent.trim() && !hasAttachments) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord content in runtime payload",
            result: { failed: true, reason: "missing_content" },
          };
        }

        // Shared array for break-glass secret reveals — populated by reveal_secret tool
        const revealedSecretValues: string[] = [];

        const botToken = await resolveDiscordBotToken(admin, context.run.tenant_id);
        if (!botToken) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord bot token for tenant runtime dispatch",
            result: { failed: true, reason: "missing_bot_token" },
          };
        }
        const governance = await resolveTenantRuntimeGovernancePolicy(
          admin,
          context.run.tenant_id
        );

        const nextAction = await applyQueuedTenantRuntimeNextAction(admin, context.run, {
          actorId,
        });
        const activeRun = nextAction.run;
        const consumedNextActionToolKey =
          nextAction.action?.kind === "approved_tool_continuation" &&
          nextAction.action.state === "consumed"
            ? nextAction.action.tool_key
            : null;
        const consumedNextActionResult =
          nextAction.action?.kind === "approved_tool_continuation" &&
          nextAction.action.state === "consumed"
            ? nextAction.action.result
            : null;
        const runtimeSystemPromptAddendum = [
          isFollowUp ? followUpPrompt : null,
          nextAction.systemPromptAddendum,
        ]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .join("\n\n");

        // Resolve typing mode from agent config (defaults to "instant")
        let typingMode: "instant" | "thinking" | "message" = "instant";
        let runtimeReplyOrchestrator: DiscordRuntimeReplyOrchestrator | null = null;
        const triggerTypingIndicator = async (): Promise<void> => {
          if (runtimeReplyOrchestrator) {
            await runtimeReplyOrchestrator.refreshTyping();
          }
        };

        // Track chunks that were actually delivered to Discord (not just attempted)
        const deliveredIntermediateChunks: string[] = [];
        const sentStatusKeys = new Set<string>();
        let lastUserVisibleActivityAt = Date.now();
        let lastAutomatedProgressUpdateAt = 0;
        let lastObligationHeartbeatAt = 0;
        let automatedProgressUpdatesSent = 0;
        let progressUpdatesSentCount = 0;
        let lastToolPhase: string | null = null;
        let followUpScheduled = false;
        let obligation: RuntimeObligation | null = await getObligationByRunId(
          admin,
          activeRun.id
        ).catch(() => null);

        const recordVisibleProgress = async (
          source: "heartbeat" | "status" | "step" | "final" | "delegation" | "file_ready",
          visibility: "progress" | "final",
          sentChunk: string
        ): Promise<void> => {
          deliveredIntermediateChunks.push(sentChunk);
          lastUserVisibleActivityAt = Date.now();

          if (source !== "final") {
            progressUpdatesSentCount += 1;
          }

          if (obligation && visibility !== "final") {
            if (source === "heartbeat") {
              await recordObligationHeartbeat(admin, obligation.id, activeRun.id, {
                source,
                content_preview: sentChunk.slice(0, 160),
              }).catch(() => {});
            } else {
              await recordObligationToolPhase(admin, obligation.id, activeRun.id, {
                source,
                content_preview: sentChunk.slice(0, 160),
              }).catch(() => {});
            }
            await recordUserUpdate(admin, obligation.id, activeRun.id, {
              source,
              content_preview: sentChunk.slice(0, 160),
            }).catch(() => {});
            obligation = await getObligationById(admin, obligation.id).catch(() => obligation);
          }
        };

        const sendVisibleReply = async (
          content: string,
          options?: {
            dedupeKey?: string;
            visibility?: "progress" | "final";
            source?:
              | "heartbeat"
              | "status"
              | "step"
              | "final"
              | "delegation"
              | "file_ready";
            delegationTargetName?: string;
            fileName?: string;
          }
        ): Promise<boolean> => {
          const trimmed = content.trim();
          if (!trimmed) {
            return false;
          }

          const dedupeKey = options?.dedupeKey;
          if (dedupeKey && sentStatusKeys.has(dedupeKey)) {
            return false;
          }

          const sentChunk = chunkReplyContent(trimmed)[0]?.trim();
          if (!sentChunk) {
            return false;
          }
          const source = options?.source ?? "status";
          const visibility = options?.visibility ?? "progress";

          let sent = false;
          if (!runtimeReplyOrchestrator) {
            return false;
          }
          if (source === "heartbeat") {
            sent = await runtimeReplyOrchestrator.emitKeepalive();
          } else if (source === "delegation") {
            sent = await runtimeReplyOrchestrator.emitDelegationStarted(
              options?.delegationTargetName
            );
          } else if (source === "file_ready") {
            sent = options?.fileName
              ? await runtimeReplyOrchestrator.emitFileReady({
                  filename: options.fileName,
                })
              : false;
          } else if (source === "status") {
            sent = await runtimeReplyOrchestrator.emitToolPhase({
              phaseKey: lastToolPhase ?? "generic_tool",
              label: sentChunk,
              sentKey: dedupeKey ?? `tool:${lastToolPhase ?? "generic_tool"}`,
            });
          } else if (source === "step") {
            sent = await runtimeReplyOrchestrator.emitIntermediateText(sentChunk);
          }

          if (!sent) {
            return false;
          }

          await recordVisibleProgress(source, visibility, sentChunk);

          if (dedupeKey) {
            sentStatusKeys.add(dedupeKey);
          }
          return true;
        };

        heartbeatInterval = setInterval(async () => {
          if (
            obligation &&
            Date.now() - lastObligationHeartbeatAt > OBLIGATION_HEARTBEAT_UPDATE_MS
          ) {
            lastObligationHeartbeatAt = Date.now();
            recordObligationHeartbeat(admin, obligation.id, activeRun.id, {
              source: "worker_heartbeat",
            }).catch(() => {});
          }

          const silenceMs = Date.now() - lastUserVisibleActivityAt;
          if (typingMode !== "message" && silenceMs > TYPING_REFRESH_INTERVAL_MS) {
            triggerTypingIndicator().catch(() => {});
          }

          if (
            silenceMs > LONG_TASK_PROGRESS_UPDATE_MS &&
            automatedProgressUpdatesSent < MAX_AUTOMATED_PROGRESS_UPDATES &&
            Date.now() - lastAutomatedProgressUpdateAt > LONG_TASK_PROGRESS_UPDATE_MS
          ) {
            const nextMessage = getContextualProgressMessage(lastToolPhase, automatedProgressUpdatesSent);
            lastAutomatedProgressUpdateAt = Date.now();
            automatedProgressUpdatesSent += 1;
            sendVisibleReply(nextMessage, {
              dedupeKey: `status:progress:${automatedProgressUpdatesSent}`,
              visibility: "progress",
              source: "heartbeat",
            }).catch(() => {});
          }
        }, PROGRESS_HEARTBEAT_INTERVAL_MS);

        const turn = await runAgentTurn({
          admin,
          context: {
            ...context,
            run: activeRun,
          },
          actorRole,
          actorId,
          actorDiscordId,
          workerKind: "discord_runtime",
          systemPromptAddendum: runtimeSystemPromptAddendum || null,
          extraDelegationContext: {
            revealedSecretValues,
          },
          assemble: async ({ delegationConfig, fastModel }) =>
            assembleContext(admin, {
              tenantId: activeRun.tenant_id,
              customerId: activeRun.customer_id,
              channelId,
              userId,
              content: userContent || (hasAttachments ? "What's in this image?" : ""),
              messageId: inboundMessageId,
              isDm: !guildId,
              imageUrls: imageAttachments.map((a) => a.url),
              runtimeRun: activeRun,
              actorRole,
              actorId,
              actorDiscordId,
              fastModel: fastModel ?? undefined,
              revealedSecretValues,
              delegationConfig,
              ...(isFollowUp
                ? {
                    retrievalQuery: followUpRetrievalQuery,
                    storedInboundContent: "[follow-up check-in]",
                  }
                : {}),
            }),
          transformTools: ({ tools }) => {
            if (!isCron) {
              return tools;
            }

            const BUILT_IN_PREFIXES = ["memory_", "schedule_", "conversation_"];
            const DELEGATION_TOOLS = [
              "delegate_task",
              "delegate_task_async",
              "delegation_poll",
              "delegation_cancel",
            ];
            const STANDALONE_TOOLS = ["file_create"];
            const filtered: Record<string, typeof tools[string]> = {};

            if (Array.isArray(payload.custom_tools) && payload.custom_tools.length > 0) {
              const allowedTools = new Set(payload.custom_tools as string[]);
              const skillToolPrefixes: Record<string, string[]> = {};
              const allowedPrefixes = Array.from(allowedTools).flatMap(
                (skill) => skillToolPrefixes[skill] || []
              );
              for (const [name, tool] of Object.entries(tools)) {
                const isAlwaysAvailable =
                  name.startsWith("memory_") ||
                  name.startsWith("schedule_") ||
                  DELEGATION_TOOLS.includes(name) ||
                  STANDALONE_TOOLS.includes(name);
                const matchesSkill = allowedPrefixes.some((prefix) =>
                  name.startsWith(prefix)
                );
                const isExplicitlyAllowed = allowedTools.has(name);
                if (isAlwaysAvailable || matchesSkill || isExplicitlyAllowed) {
                  filtered[name] = tool;
                }
              }
              return filtered;
            }

            for (const [name, tool] of Object.entries(tools)) {
              if (
                BUILT_IN_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
                DELEGATION_TOOLS.includes(name) ||
                STANDALONE_TOOLS.includes(name)
              ) {
                filtered[name] = tool;
              }
            }
            return filtered;
          },
          beforeGenerate: async ({ assembled }) => {
            const agentConfig = assembled.agent?.config;
            typingMode =
              agentConfig &&
              (agentConfig["typing_mode"] === "thinking" ||
                agentConfig["typing_mode"] === "message")
                ? agentConfig["typing_mode"]
                : "instant";
            replyOrchestrator = new DiscordRuntimeReplyOrchestrator({
              admin,
              run: activeRun,
              botToken,
              channelId,
              replyToMessageId: inboundMessageId,
            });
            runtimeReplyOrchestrator = replyOrchestrator;

            if (typingMode === "instant") {
              await triggerTypingIndicator();
            }

            if (typingMode === "thinking") {
              await triggerTypingIndicator();
            }
          },
          onStepFinish: async (step) => {
            // Track the last tool used for contextual progress messages
            if (step.toolCalls.length > 0) {
              lastToolPhase = step.toolCalls[step.toolCalls.length - 1].toolName;
            }

            const lifecycleEvents = extractWorkerLifecycleToolEvents(step);
            for (const event of lifecycleEvents) {
              if (event.type === "delegation_started") {
                await sendVisibleReply(event.message, {
                  dedupeKey: event.dedupeKey,
                  visibility: "progress",
                  source: "delegation",
                  delegationTargetName: event.targetAgentName,
                });
                continue;
              }

              await sendVisibleReply(event.message, {
                dedupeKey: event.dedupeKey,
                visibility: "progress",
                source: "file_ready",
                fileName: event.fileName,
              });
            }

            // Send intermediate text when: step has text AND more steps follow AND not a cron run
            const suppressedPreamble =
              !isCron &&
              step.finishReason === "tool-calls" &&
              !!step.text?.trim() &&
              shouldSuppressIntermediateToolPreamble(step.text);

            if (
              isCron ||
              step.finishReason !== "tool-calls" ||
              !step.text?.trim() ||
              suppressedPreamble
            ) {
              // Layer 3: send contextual status message for silent tool calls
              if (
                !isCron &&
                step.finishReason === "tool-calls" &&
                (!step.text?.trim() || suppressedPreamble) &&
                step.toolCalls.length > 0
              ) {
                const statusToolName = step.toolCalls
                  .map((toolCall) => toolCall.toolName)
                  .find((toolName) => getToolStatusKey(toolName) !== null);
                if (statusToolName) {
                  const statusMsg = getToolStatusMessage(statusToolName);
                  const statusKey = getToolStatusKey(statusToolName);
                  if (statusMsg && statusKey) {
                    await sendVisibleReply(statusMsg, {
                      dedupeKey: `tool:${statusKey}`,
                      visibility: "progress",
                      source: "status",
                    });
                  }
                }
              }
              return;
            }

            let intermediateText = step.text.trim();

            // Redact secrets if any were revealed
            if (revealedSecretValues.length > 0) {
              const stepRedactor = buildRedactor(revealedSecretValues);
              intermediateText = stepRedactor(intermediateText);
            }

            await sendVisibleReply(intermediateText, {
              visibility: "progress",
              source: "step",
            });

            // Refresh typing indicator for next step
            triggerTypingIndicator().catch(() => {});
          },
        });

        // Stop the activity heartbeat now that generation is complete
        clearInterval(heartbeatInterval);

        // Capture multi-step messages for history reconstruction
        const assembled = turn.assembled;
        const resolvedTools = turn.resolvedTools;
        const executor = turn.executor;
        const result = turn.result;
        const responseMessages = result.response?.messages ?? [];
        const inputTokens = turn.inputTokens;
        const outputTokens = turn.outputTokens;
        const primaryModelId = turn.primaryModelId;
        const primaryModel = turn.primaryModel;
        const fastModel = turn.fastModel;
        const contextWindowTokens = turn.contextWindowTokens;
        const startTime = turn.startTime;

        let responseText = result.text?.trim() || "";

        // Reconcile intermediate sends with final text to avoid duplicate content.
        // AI SDK v6 concatenates all step texts into result.text, so if intermediate
        // chunks were already delivered to Discord, strip them from the final send.
        let skipFinalSend = false;
        if (deliveredIntermediateChunks.length > 0 && responseText) {
          let stripped = responseText;
          for (const delivered of deliveredIntermediateChunks) {
            if (stripped.startsWith(delivered)) {
              stripped = stripped.slice(delivered.length).trim();
            }
          }
          if (stripped.length > 0) {
            responseText = stripped;
          } else {
            // Entire response was already delivered as intermediate messages.
            // However, if tools executed AFTER the last intermediate send
            // (e.g. "Let me try..." followed by tool calls), the user still
            // needs a follow-up with the outcome. Clear responseText so the
            // fallback path below generates a tool-result summary.
            const hasToolCallsAfterText = result.steps.some(
              (s) =>
                s.toolCalls.length > 0 &&
                s.toolResults &&
                s.toolResults.length > 0
            );
            if (hasToolCallsAfterText && executor.records.length > 0) {
              responseText = "";
              // Let the fallback path handle it — don't skip
            } else {
              skipFinalSend = true;
            }
          }
        }

        // Fallback when maxSteps exhausted on a tool-call step with no final text.
        // Build a natural-language summary — never expose raw JSON or tool names.
        let usedInformationalFallback = false;
        if (!responseText && consumedNextActionToolKey && consumedNextActionResult) {
          // Post-approval server-executed tool: guarantee a confirmation message
          if (consumedNextActionResult.status === "completed") {
            const friendly = FRIENDLY_TOOL_SUMMARY_MESSAGES[consumedNextActionToolKey];
            responseText = friendly ?? "Done — that's taken care of.";
          } else {
            responseText = consumedNextActionResult.error
              ? `I tried to finish that after approval, but hit an issue: ${consumedNextActionResult.error}`
              : "I tried to finish that after approval, but something went wrong.";
          }
        }
        if (!responseText) {
          // Layer 1: Try rich informational fallback first (web_search, web_fetch results)
          const richFallback = formatInformationalFallback(result.steps, executor.records);
          if (richFallback) {
            responseText = richFallback;
            usedInformationalFallback = true;
          } else {
            // Action-only fallback path
            const successfulRecords = executor.records.filter((r) => r.success);
            if (successfulRecords.length > 0) {
              const queryToolRecords = successfulRecords.filter((record) =>
                isQueryLikeToolRecord(record)
              );
              const allQuery = queryToolRecords.length > 0 && queryToolRecords.length === successfulRecords.length;

              // For query-only invocations, try to surface the tool output directly
              if (allQuery && successfulRecords.length > 0) {
                const primaryQueryRecord =
                  queryToolRecords.find((record) => record.toolName === "integration_api_call")
                  ?? successfulRecords[0];
                const output = primaryQueryRecord.outputSummary;
                const formatted = formatQueryToolOutput(
                  primaryQueryRecord.toolName,
                  output,
                  primaryQueryRecord.inputSummary
                );
                if (formatted) {
                  responseText = formatted;
                } else {
                  responseText = "I checked that, but I couldn't turn the result into a clean summary. Could you ask again?";
                }
              } else {
                responseText = formatActionFallback(successfulRecords)
                  ?? "I wrapped that up, but I couldn't put the outcome into a clean summary.";
              }
            } else {
              // Check if failure is due to approval gates
              const approvalBlockedRecords = executor.records.filter(
                (r) => r.errorClass === "approval_required"
              );
              if (approvalBlockedRecords.length > 0) {
                const toolNames = approvalBlockedRecords.map((r) => {
                  const name = r.toolName;
                  if (name === "config_create_agent") return "creating an agent";
                  if (name === "config_archive_agent") return "archiving an agent";
                  if (name.startsWith("config_")) return "updating the configuration";
                  if (name.startsWith("schedule_")) return "modifying schedules";
                  return name.replace(/_/g, " ");
                });
                const unique = [...new Set(toolNames)];
                responseText = `I need approval from a team admin before ${unique.join(" and ")}. I've sent an approval request — once it's approved, I'll take care of it.`;
              } else {
                const allToolNames = result.steps
                  .flatMap((s) => s.toolCalls.map((tc) => tc.toolName));
                if (allToolNames.length > 0) {
                  responseText = "I tried to handle that but ran into a snag. Want me to give it another shot?";
                } else {
                  responseText = "Hmm, I wasn't able to put together a response for that. Could you try rephrasing?";
                }
              }
            }
          }
        }

        // Post-turn redaction: strip revealed secret values from stored text
        const redactor = revealedSecretValues.length > 0
          ? buildRedactor(revealedSecretValues)
          : null;
        if (redactor) {
          responseText = redactor(responseText);
        }

        // Layer 4: Success-without-substance detector — replace generic confirmations
        // when informational tools succeeded but the model didn't share findings.
        if (
          !usedInformationalFallback &&
          responseText.length > 0 &&
          isGenericInformationalResponse(responseText, executor.records)
        ) {
          const richReplacement = formatInformationalFallback(result.steps, executor.records);
          if (richReplacement) {
            responseText = richReplacement;
            usedInformationalFallback = true;
          } else {
            console.warn("[ai-worker] Success-without-substance: informational tools succeeded but could not format fallback");
          }
        }

        if (
          responseText.length > 0 &&
          isGenericQueryResponse(responseText, executor.records)
        ) {
          const successfulQueryRecords = executor.records.filter(
            (record) => record.success && isQueryLikeToolRecord(record)
          );
          if (successfulQueryRecords.length > 0) {
            const primaryQueryRecord =
              successfulQueryRecords.find((record) => record.toolName === "integration_api_call")
              ?? successfulQueryRecords[0];
            const formatted = formatQueryToolOutput(
              primaryQueryRecord.toolName,
              primaryQueryRecord.outputSummary,
              primaryQueryRecord.inputSummary
            );
            if (formatted) {
              responseText = formatted;
            }
          }
        }

        const followUpDepth = typeof payload.follow_up_depth === "number" ? payload.follow_up_depth : 0;

        // Check if any tool was blocked by the approval gate — if so, the run
        // should park in awaiting_approval so the approval decision route can
        // resume it after the user approves.
        const hasApprovalRequired = executor.records.some(
          (r) => r.errorClass === "approval_required"
        );
        const approvalId = extractApprovalIdFromExecutorRecords(
          executor.records
        );
        const hasExplicitFollowUp = executor.records.some(
          (r) => r.toolName === "task_follow_up" && r.success
        );
        const executorToolSummary = executor.records
          .slice(0, 8)
          .map((r) => `${r.toolName}:${r.success ? "success" : r.errorClass ?? "error"}`)
          .join(", ");
        // When a post-approval tool ran server-side, executor.records is empty.
        // Inject a synthetic entry so buildFriendlyToolSummary can produce a confirmation.
        const toolSummary =
          !executorToolSummary && consumedNextActionToolKey && consumedNextActionResult?.status === "completed"
            ? `${consumedNextActionToolKey}:success`
            : executorToolSummary;
        const terminalState: RunTerminalState = hasApprovalRequired
          ? "continuing"
          : hasExplicitFollowUp
            ? "continuing"
            : await resolveRunTerminalState({
                model: fastModel ?? primaryModel,
                userRequest: userContent,
                responseText,
                progressUpdatesSentCount,
                toolSummary,
              });

        if (!isCron && followUpDepth < MAX_FOLLOW_UP_DEPTH) {
          const shouldScheduleFollowUp = shouldScheduleStructuralFollowUp({
            hasExplicitFollowUp,
            hasApprovalRequired,
            progressUpdatesSentCount,
            finalReplyWillBeSent: !skipFinalSend && responseText.length > 0,
            terminalState,
          });

          if (shouldScheduleFollowUp && assembled.agentId) {
            const followUpTaskSummary =
              responseText.slice(0, 300) ||
              "Continue the unresolved task and report back with findings.";
            const scheduled = await scheduleFollowUp({
              admin,
              tenantId: context.run.tenant_id,
              customerId: context.run.customer_id,
              agentId: assembled.agentId,
              channelId,
              runId: context.run.id,
              followUpDepth,
              taskSummary: followUpTaskSummary,
              reason:
                "The run sent progress updates but did not reach a terminal user-visible answer.",
              delayMinutes: 2,
              messageId: inboundMessageId,
            }).catch(() => ({ success: false }));

            if (scheduled.success) {
              followUpScheduled = true;
              if (responseText.length > 0) {
                responseText += "\n\nI'll check back here in about 2 minutes.";
              } else {
                await sendVisibleReply(
                  "I'm still on this - I'll check back here in about 2 minutes.",
                  {
                    dedupeKey: "status:auto-follow-up",
                    visibility: "progress",
                    source: "status",
                  }
                );
              }
            }
          }
        }

        // Send to Discord (skip if intermediate sends already covered the full response)
        let sent: { messageIds: string[]; partsSent: number } = { messageIds: [], partsSent: 0 };
        let finalReplySent = false;
        let persistedResponseText = responseText;
        const pendingFiles = activeRun.id ? peekPendingFiles(activeRun.id) : [];

        if (hasApprovalRequired) {
          const approvalOrchestrator =
            (runtimeReplyOrchestrator ?? replyOrchestrator) as
              | DiscordRuntimeReplyOrchestrator
              | null;
          finalReplySent = approvalOrchestrator
            ? await approvalOrchestrator.emitApprovalRequested({
                approvalId: approvalId ?? "approval_required",
              })
            : false;
          persistedResponseText = finalReplySent ? APPROVAL_REQUIRED_REPLY : "";
          skipFinalSend = true;
          responseText = "";
        } else {
          const timeoutFetch: typeof fetch = async (url, init) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), governance.dispatch_timeout_ms);
            try {
              return await fetch(url, { ...init, signal: controller.signal });
            } finally {
              clearTimeout(timeout);
            }
          };

          const terminalDispatch = await dispatchDiscordRuntimeTerminalSuccess(
            admin,
            activeRun,
            {
              channelId,
              replyToMessageId: inboundMessageId,
              responseText,
              skipFinalSend,
              terminalState,
              toolSummary,
              progressUpdatesSentCount,
              pendingFiles,
              fetchImpl: timeoutFetch,
            }
          );

          finalReplySent = terminalDispatch.sent;
          responseText = terminalDispatch.text;
          persistedResponseText = responseText;
          sent = {
            messageIds: terminalDispatch.messageIds,
            partsSent: terminalDispatch.partsSent,
          };
          skipFinalSend = true;
          if (finalReplySent && activeRun.id && pendingFiles.length > 0) {
            clearPendingFiles(activeRun.id);
          }
        }

        await storeOutboundMessage(admin, {
          tenantId: activeRun.tenant_id,
          customerId: activeRun.customer_id,
          sessionId: assembled.sessionId,
          agentId: assembled.agentId,
          content: persistedResponseText,
          tokenCount: inputTokens + outputTokens,
          toolCalls: responseMessages.length > 0
            ? responseMessages.map((m) => m as Record<string, unknown>)
            : undefined,
        }).catch((err) => {
          console.error("[ai-worker] Failed to store outbound message:", safeErrorMessage(err));
        });

        await recordAgentTurnArtifacts({
          admin,
          run: activeRun,
          assembled,
          resolvedTools,
          executor,
          sessionId: assembled.sessionId,
          modelId: primaryModelId,
          fastModel,
          contextWindowTokens,
          startTime,
          inputTokens,
          outputTokens,
          inputCostPerMillion: turn.primaryInputCost,
          outputCostPerMillion: turn.primaryOutputCost,
          loggerPrefix: "ai-worker",
          mapInputSummary: redactor ? (summary) => redactor(summary) : undefined,
        });

        const runResult = {
          ack: "ai_response_dispatched",
          model: primaryModelId,
          agent_id: assembled.agentId,
          agent_name: assembled.agentDisplayName,
          session_id: assembled.sessionId,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          dispatched_channel_id: channelId,
          dispatched_message_ids: sent.messageIds,
          dispatched_message_parts: sent.partsSent,
          response_preview: responseText.slice(0, 500),
          intermediate_progress_updates_sent: progressUpdatesSentCount,
          final_reply_sent: finalReplySent,
          terminal_state: terminalState,
          follow_up_scheduled: followUpScheduled,
          approval_id: approvalId,
          request_trace_id: context.requestTraceId,
          processed_at: new Date().toISOString(),
        };

        // For cron/follow-up runs, treat Discord delivery failure as a run
        // failure so the cron executor retries instead of silently moving on.
        const isSystemInitiated = isCron || isFollowUp;
        const deliveryFailed = !finalReplySent && !hasApprovalRequired && isSystemInitiated && progressUpdatesSentCount === 0;

        return {
          outcome: hasApprovalRequired
            ? "awaiting_approval"
            : deliveryFailed
              ? "failed"
              : "completed",
          errorMessage: deliveryFailed
            ? "Discord delivery failed — the AI response was generated but could not be sent to the channel"
            : undefined,
          result: runResult,
        };
      } catch (error) {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        await flushBrowserSessionsForRun(context.run.id).catch(() => []);
        const failureOrchestrator =
          replyOrchestrator as DiscordRuntimeReplyOrchestrator | null;
        if (failureOrchestrator) {
          await failureOrchestrator.finalizeFailure(
            safeErrorMessage(error, "AI worker dispatch failed")
          ).catch(() => {});
        }
        const rateLimitError = error instanceof DiscordApiError && error.status === 429;
        const retryAfterSeconds =
          error instanceof DiscordApiError ? error.retryAfterSeconds : null;
        return {
          outcome: "failed",
          errorMessage: safeErrorMessage(error, "AI worker dispatch failed"),
          result: {
            failed: true,
            circuit_breaker_open: error instanceof CircuitBreakerOpenError,
            circuit_breaker_retry_after_ms:
              error instanceof CircuitBreakerOpenError ? error.retryAfterMs : null,
            discord_status: error instanceof DiscordApiError ? error.status : null,
            discord_error_message:
              error instanceof DiscordApiError ? error.message : null,
            discord_rate_limited: rateLimitError,
            discord_retry_after_seconds: retryAfterSeconds,
            processed_at: new Date().toISOString(),
          },
        };
      }
    },
  };
}
