import { generateObject, generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AI_CONFIG } from "./client";
import { estimateTokenUsageCostCents, recordTokenUsage } from "./usage-tracker";
import { assembleContext } from "./context-assembler";
import { storeOutboundMessage } from "./message-store";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { maybeGenerateSummary } from "./session-summarizer";
import { parseAttachmentsFromPayload, isImageAttachment } from "./attachment-handler";
import { extractBehavioralPatterns } from "./procedural-memory";
import { recordConversationTrace, extractWebCitations, extractDelegationEvents } from "./trace-recorder";
import {
  formatActionFallback,
  formatInformationalFallback,
  getToolStatusKey,
  getToolStatusMessage,
  isGenericInformationalResponse,
} from "./fallback-formatter";
import { flushBrowserSessionsForRun } from "./tools/browser";
import { resolveWorkerModels } from "./model-resolver";
import {
  createUnifiedToolExecutor,
  registerComposioToolKeyMappings,
  registerMcpToolKeyMappings,
} from "@/lib/runtime/unified-tool-executor";
import { loadGuardrailConfig, loadMiddlewareRateLimits } from "@/lib/runtime/guardrail-config-loader";
import { createDefaultGuardrailPipeline } from "@/lib/runtime/guardrail-middleware";
import {
  sendDiscordChannelMessage,
  sendDiscordChannelMessageSequence,
  sendDiscordChannelMessageWithFiles,
  sendDiscordTypingIndicator,
  buildDiscordRuntimeResponseParts,
  DiscordApiError,
  checkAndMarkFinalReply,
} from "@/lib/runtime/tenant-runtime-discord";
import { collectPendingFiles } from "./tools/file-create";
import { scheduleFollowUp, MAX_FOLLOW_UP_DEPTH } from "./tools/follow-up";
import {
  getObligationById,
  getObligationByRunId,
  recordObligationHeartbeat,
  recordObligationToolPhase,
  recordUserUpdate,
  shouldSendStatusUpdate,
} from "@/lib/runtime/obligation-coordinator";
import {
  CircuitBreakerOpenError,
  runWithCircuitBreaker,
} from "@/lib/runtime/tenant-runtime-circuit-breaker";
import { checkTrialAndSpendingBlock } from "./trial-guard";
import { buildRedactor } from "@/lib/secrets/redaction";
import { resolveTenantRuntimeGovernancePolicy } from "@/lib/runtime/tenant-runtime-governance";
import type {
  TenantRuntimeWorker,
  TenantRuntimeWorkerContext,
  TenantRuntimeWorkerResult,
} from "@/lib/runtime/tenant-runtime-worker";
import type { RuntimeObligation } from "@/types/obligation";
import type { TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
const PROGRESS_HEARTBEAT_INTERVAL_MS = 5_000;
const TYPING_REFRESH_INTERVAL_MS = 10_000;
const LONG_TASK_PROGRESS_UPDATE_MS = 20_000;
const OBLIGATION_HEARTBEAT_UPDATE_MS = 20_000;
const MAX_AUTOMATED_PROGRESS_UPDATES = 3;
const GENERIC_PROGRESS_MESSAGES = [
  "Still working through it.",
  "Almost there.",
  "Just finishing up.",
];

const CONTEXTUAL_PROGRESS_MESSAGES: Record<string, string[]> = {
  web_search: [
    "I'm reading through the search results now.",
    "Checking one more source to be thorough.",
  ],
  web_fetch: [
    "I'm going through the page now.",
    "Almost done reading through it.",
  ],
  delegate_task: [
    "My teammate is working on that part.",
    "Waiting on the result from my teammate.",
  ],
  delegate_task_async: [
    "My teammate is working on that part.",
    "Waiting on the result from my teammate.",
  ],
  memory_search: [
    "I'm digging through my notes on that.",
  ],
  integration_api_call: [
    "Waiting on the API response.",
    "Still waiting on the response.",
  ],
};

function getContextualProgressMessage(toolPhase: string | null, index: number): string {
  if (toolPhase && CONTEXTUAL_PROGRESS_MESSAGES[toolPhase]) {
    const msgs = CONTEXTUAL_PROGRESS_MESSAGES[toolPhase];
    return msgs[Math.min(index, msgs.length - 1)];
  }
  return GENERIC_PROGRESS_MESSAGES[Math.min(index, GENERIC_PROGRESS_MESSAGES.length - 1)];
}

function getDiscordBotToken(): string {
  const token = process.env[DISCORD_BOT_TOKEN_ENV];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }
  return token;
}

function resolveActorRole(payload: Record<string, unknown>): TenantRole {
  const value = payload.actor_role;
  if (value === "owner" || value === "admin" || value === "operator" || value === "viewer") {
    return value;
  }
  return "viewer";
}

const CRON_PROMPTS: Record<string, string> = {
  morning_briefing_fallback:
    "Generate a morning operations briefing for the team. Include today's priorities, timing-sensitive items, and any conditions or blockers that could affect execution. Be concise.",
  daily_digest:
    "Generate a daily digest for the team. Highlight important external signals, notable changes since yesterday, and what needs attention today. Be concise.",
  evening_recap:
    "Generate an evening summary of today's activity. Show what was completed, what changed, and any notable details that should carry into tomorrow. If nothing happened, say so briefly.",
  // Legacy keys — kept for existing DB rows until schedule migration completes
  morning_weather:
    "Generate a morning operations briefing for the team. Include today's priorities, timing-sensitive items, and any conditions or blockers that could affect execution. Be concise.",
  daily_market_summary:
    "Generate a daily digest for the team. Highlight important external signals, notable changes since yesterday, and what needs attention today. Be concise.",
  evening_ticket_summary:
    "Generate an evening summary of today's activity. Show what was completed, what changed, and any notable details that should carry into tomorrow. If nothing happened, say so briefly.",
};

interface BriefingSections {
  // Current generic keys
  conditions?: boolean;
  external_updates?: boolean;
  activity_recap?: boolean;
  // Legacy keys — accepted for backward compatibility
  weather?: boolean;
  market_data?: boolean;
  ticket_summary?: boolean;
}

/**
 * Format query tool output into a human-readable fallback when the model
 * didn't produce final prose. Returns null if the output can't be formatted.
 */
function formatQueryToolOutput(toolName: string, outputSummary: string): string | null {
  try {
    const data = JSON.parse(outputSummary);

    if (toolName === "schedule_list") {
      const schedules = data.schedules ?? data;
      if (Array.isArray(schedules) && schedules.length === 0) {
        return "You don't have any schedules set up right now. Want me to create one?";
      }
      if (Array.isArray(schedules) && schedules.length > 0) {
        const lines = schedules.map((s: Record<string, unknown>) => {
          const name = s.name || s.display_name || s.schedule_key || "Unnamed";
          const freq = s.frequency || s.cron_expression || "";
          const status = s.enabled === false ? " (disabled)" : "";
          return `• **${name}** — ${freq}${status}`;
        });
        return `Here are your current schedules:\n\n${lines.join("\n")}`;
      }
    }

    if (toolName === "config_view_my_config") {
      if (data && typeof data === "object") {
        const role = data.role || data.agent_role;
        const goal = data.goal;
        if (role || goal) {
          const parts: string[] = [];
          if (role) parts.push(`**Role:** ${role}`);
          if (goal) parts.push(`**Goal:** ${goal}`);
          return `Here's my current configuration:\n\n${parts.join("\n")}`;
        }
      }
    }

    if (toolName === "memory_search") {
      const memories = data.memories ?? data.results ?? data;
      if (Array.isArray(memories) && memories.length === 0) {
        return "I didn't find any matching memories.";
      }
      if (Array.isArray(memories) && memories.length > 0) {
        const lines = memories.slice(0, 5).map((m: Record<string, unknown>) => {
          const content = m.content || m.text || m.summary || JSON.stringify(m);
          return `• ${typeof content === "string" ? content.slice(0, 200) : String(content)}`;
        });
        return `Here's what I found:\n\n${lines.join("\n")}`;
      }
    }
  } catch {
    // outputSummary wasn't valid JSON — fall through
  }
  return null;
}

function buildFollowUpPrompt(payload: Record<string, unknown>): string {
  const taskSummary =
    typeof payload.task_summary === "string"
      ? payload.task_summary
      : "a previous task";
  const reason =
    typeof payload.reason === "string" ? payload.reason : "";
  const parts = [
    `You scheduled this follow-up while working on: ${taskSummary}`,
  ];
  if (reason) parts.push(`You wanted to check back because: ${reason}`);
  parts.push(
    "Pick up where you left off naturally. Lead with your finding or update — don't announce this is a follow-up. " +
      "If the task is done, share the result. If it needs more time, explain and optionally schedule another follow-up."
  );
  return parts.join("\n\n");
}

function buildCronPrompt(
  scheduleKey: string | null,
  payload?: Record<string, unknown>
): string {
  // Custom schedules carry their own prompt
  if (payload) {
    const customPrompt = payload.custom_prompt;
    if (typeof customPrompt === "string" && customPrompt.length > 0) {
      return customPrompt;
    }
  }

  if (scheduleKey === "morning_briefing" && payload) {
    const sections = (payload.briefing_sections || {}) as BriefingSections;
    const parts: string[] = [];
    // Accept both new and legacy section keys
    const hasConditions = sections.conditions ?? sections.weather;
    const hasExternalUpdates = sections.external_updates ?? sections.market_data;
    const hasActivityRecap = sections.activity_recap ?? sections.ticket_summary;
    if (hasConditions !== false) {
      parts.push(
        "Include timing-sensitive conditions or external constraints that could affect today's work."
      );
    }
    if (hasExternalUpdates !== false) {
      parts.push(
        "Include relevant external updates, plus any meaningful changes since yesterday."
      );
    }
    if (hasActivityRecap) {
      parts.push(
        "Include a short summary of yesterday's completed work and outstanding follow-ups."
      );
    }
    return `Generate a morning briefing for the team. ${parts.join(" ")} Be concise.`;
  }

  if (scheduleKey && CRON_PROMPTS[scheduleKey]) {
    return CRON_PROMPTS[scheduleKey];
  }
  return "Generate a proactive update for the team based on your role and the current context.";
}

/**
 * When a run is resumed after approval, resolve which tool keys were approved
 * so the executor can bypass the approval gate for those tools.
 */
async function resolvePreApprovedToolKeys(
  adminClient: SupabaseClient,
  run: TenantRuntimeRun
): Promise<Set<string>> {
  const keys = new Set<string>();
  const meta = run.metadata;
  if (!meta?.resumed_after_approval || typeof meta.approval_id !== "string") {
    return keys;
  }

  const { data } = await adminClient
    .from("tenant_approvals")
    .select("status, request_payload")
    .eq("id", meta.approval_id)
    .eq("tenant_id", run.tenant_id)
    .maybeSingle();

  if (data?.status === "approved" && data.request_payload) {
    const payload =
      typeof data.request_payload === "object" && !Array.isArray(data.request_payload)
        ? (data.request_payload as Record<string, unknown>)
        : {};
    if (typeof payload.tool_key === "string") {
      keys.add(payload.tool_key);
    }
  }

  return keys;
}

interface ExecutorRecordLike {
  toolName: string;
  success: boolean;
  errorClass?: string | null;
  outputSummary: string;
}

function extractApprovalIdFromExecutorRecords(
  records: readonly ExecutorRecordLike[]
): string | null {
  for (const record of records) {
    if (record.errorClass !== "approval_required") {
      continue;
    }

    try {
      const parsed = JSON.parse(record.outputSummary) as Record<string, unknown>;
      if (typeof parsed.approval_id === "string" && parsed.approval_id.length > 0) {
        return parsed.approval_id;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export interface StructuralFollowUpDecisionInput {
  hasExplicitFollowUp: boolean;
  hasApprovalRequired: boolean;
  progressUpdatesSentCount: number;
  finalReplyWillBeSent: boolean;
  terminalState: RunTerminalState;
}

export function shouldScheduleStructuralFollowUp(
  input: StructuralFollowUpDecisionInput
): boolean {
  if (input.hasExplicitFollowUp || input.hasApprovalRequired) {
    return false;
  }

  if (input.terminalState === "continuing") {
    return true;
  }

  return input.progressUpdatesSentCount > 0 && !input.finalReplyWillBeSent;
}

const runTerminalStateSchema = z.object({
  state: z.enum(["completed", "continuing"]),
  rationale: z.string().max(200).optional(),
});

type RunTerminalState = z.infer<typeof runTerminalStateSchema>["state"];

async function resolveRunTerminalState(input: {
  model: Parameters<typeof generateObject<typeof runTerminalStateSchema>>[0]["model"];
  userRequest: string;
  responseText: string;
  progressUpdatesSentCount: number;
  toolSummary: string;
}): Promise<RunTerminalState> {
  if (!input.responseText.trim()) {
    return input.progressUpdatesSentCount > 0 ? "continuing" : "completed";
  }

  try {
    const { object } = await generateObject({
      model: input.model,
      schema: runTerminalStateSchema,
      temperature: 0,
      system:
        "Classify the assistant turn's execution state. " +
        "Return `completed` only if the user's request was actually answered or fully executed in this run. " +
        "Return `continuing` if the assistant is still researching, planning next steps, promising future work, monitoring something over time, or has not yet delivered the requested result. " +
        "If unsure, choose `continuing`.",
      prompt: [
        `User request: ${input.userRequest || "[empty]"}`,
        `Assistant reply draft: ${input.responseText}`,
        `Progress updates already sent: ${input.progressUpdatesSentCount}`,
        `Tool summary: ${input.toolSummary || "[none]"}`,
      ].join("\n\n"),
    });
    return object.state;
  } catch {
    return input.progressUpdatesSentCount > 0 ? "continuing" : "completed";
  }
}

export function createTenantAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "discord_runtime",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      const { model: primaryModel, modelId: primaryModelId, inputCost: primaryInputCost, outputCost: primaryOutputCost, contextWindowTokens, fastModel } = resolveWorkerModels(context.resolvedModels);
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      try {
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
        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const runtimeReplyToMessageId =
          typeof payload.message_id === "string" ? payload.message_id : null;
        if (channelId && trialCheck.message) {
          const botToken = getDiscordBotToken();
          await sendDiscordChannelMessageSequence(
              {
                botToken,
                channelId,
                contents: [trialCheck.message],
                replyToMessageId: runtimeReplyToMessageId,
              },
              fetch
            ).catch(() => {});
          }
          return {
            outcome: "completed",
            result: { paused: true, reason: trialCheck.reason },
          };
        }

        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const content = typeof payload.content === "string" ? payload.content : "";
        const rawMessageId =
          typeof payload.message_id === "string" ? payload.message_id : null;
        // Cron/system runs use synthetic message IDs (e.g. "cron-...") that are
        // not valid Discord snowflakes.  Passing them as a message_reference
        // causes "Invalid Form Body" from the Discord API, so strip them.
        const inboundMessageId =
          rawMessageId && /^\d+$/.test(rawMessageId) ? rawMessageId : null;
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

        const botToken = getDiscordBotToken();
        const governance = await resolveTenantRuntimeGovernancePolicy(
          admin,
          context.run.tenant_id
        );

        const startTime = Date.now();

        // Mutable delegation context — parentGuardrails/parentRecords/parentToolKeys
        // populated after executor creation (below), before any tool executes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const delegationCtx: any = {
          currentDepth: 0,
          parentRun: context.run,
          actorRole,
          actorId,
          actorDiscordId,
          workerKind: "discord_runtime" as const,
          resolvedModels: context.resolvedModels,
          revealedSecretValues,
        };

        // Assemble context: resolve agent, build system prompt, persist messages, load history
        const assembled = await assembleContext(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          channelId,
          userId,
          content: userContent || (hasAttachments ? "What's in this image?" : ""),
          messageId: inboundMessageId,
          isDm: !guildId,
          imageUrls: imageAttachments.map((a) => a.url),
          runtimeRun: context.run,
          actorRole,
          actorId,
          actorDiscordId,
          fastModel: fastModel,
          revealedSecretValues,
          // delegationConfig uses a mutable object — parentGuardrails and parentRecords
          // are populated after executor creation (below), before any tool executes.
          delegationConfig: delegationCtx,
          // Follow-up context separation: seed retrieval with real task summary,
          // store a neutral placeholder in history, inject instructions via system prompt
          ...(isFollowUp ? {
            retrievalQuery: followUpRetrievalQuery,
            storedInboundContent: "[follow-up check-in]",
            systemPromptAddendum: followUpPrompt ?? undefined,
          } : {}),
        });

        // Custom cron jobs can scope tools to a subset
        let resolvedTools = assembled.tools;
        if (isCron) {
          // Exclude Composio tools from cron runs — they require interactive OAuth context
          const BUILT_IN_PREFIXES = ["memory_", "schedule_", "conversation_"];
          const DELEGATION_TOOLS = ["delegate_task", "delegate_task_async", "delegation_poll", "delegation_cancel"];
          const STANDALONE_TOOLS = ["file_create"];
          const filtered: typeof resolvedTools = {};

          if (Array.isArray(payload.custom_tools) && payload.custom_tools.length > 0) {
            const allowedSkills = new Set(payload.custom_tools as string[]);
            const SKILL_TOOL_PREFIXES: Record<string, string[]> = {};
            const allowedPrefixes = Array.from(allowedSkills).flatMap(
              (s) => SKILL_TOOL_PREFIXES[s] || []
            );
            for (const [name, tool] of Object.entries(resolvedTools)) {
              const isAlwaysAvailable = name.startsWith("memory_") || name.startsWith("schedule_") || DELEGATION_TOOLS.includes(name) || STANDALONE_TOOLS.includes(name);
              const matchesSkill = allowedPrefixes.some((p) => name.startsWith(p));
              if (isAlwaysAvailable || matchesSkill) {
                filtered[name] = tool;
              }
            }
          } else {
            // For standard cron runs, keep all built-in tools but exclude Composio tools
            for (const [name, tool] of Object.entries(resolvedTools)) {
              if (BUILT_IN_PREFIXES.some((p) => name.startsWith(p)) || DELEGATION_TOOLS.includes(name) || STANDALONE_TOOLS.includes(name)) {
                filtered[name] = tool;
              }
            }
          }

          resolvedTools = filtered;
        }

        // Wrap tools with unified executor (policy enforced: denied/approval-required tools blocked)
        const agentAutonomy = assembled.agent?.config?.autonomy_level;
        const [guardrailConfig, middlewareRateLimits] = await Promise.all([
          loadGuardrailConfig(admin, context.run.tenant_id, assembled.agentId),
          loadMiddlewareRateLimits(admin, context.run.tenant_id, assembled.agentId),
        ]);
        const middlewarePipeline = createDefaultGuardrailPipeline(middlewareRateLimits);

        // Resolve pre-approved tool keys from run metadata (set when resuming after approval)
        const preApprovedToolKeys = await resolvePreApprovedToolKeys(admin, context.run);

        const executor = createUnifiedToolExecutor({
          admin,
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          agentId: assembled.agentId,
          run: context.run,
          actorRole,
          actorId,
          workerKind: "discord_runtime",
          enforcePolicy: true,
          agentAutonomyLevel:
            agentAutonomy === "assisted" || agentAutonomy === "copilot" || agentAutonomy === "autopilot"
              ? agentAutonomy
              : undefined,
          guardrailConfig,
          middlewarePipeline,
          preApprovedToolKeys: preApprovedToolKeys.size > 0 ? preApprovedToolKeys : undefined,
        });
        // Register Composio key mappings so the unified executor can resolve
        // model-facing names (e.g. GITHUB_CREATE_ISSUE) to policy keys (composio.github_create_issue)
        if (assembled.composioKeyMap && assembled.composioKeyMap.size > 0) {
          registerComposioToolKeyMappings(assembled.composioKeyMap);
        }
        if (assembled.mcpKeyMap && assembled.mcpKeyMap.size > 0) {
          registerMcpToolKeyMappings(assembled.mcpKeyMap);
        }

        resolvedTools = executor.wrapAll(resolvedTools);

        // Populate delegation context with executor references (captured by closure)
        delegationCtx.parentGuardrails = executor.guardrails;
        delegationCtx.parentRecords = executor.records as unknown[];
        delegationCtx.parentToolKeys = new Set(Object.keys(resolvedTools));

        const hasTools = Object.keys(resolvedTools).length > 0;

        // Resolve typing mode from agent config (defaults to "instant")
        const agentConfig = assembled.agent?.config;
        const typingMode =
          agentConfig && (agentConfig["typing_mode"] === "thinking" || agentConfig["typing_mode"] === "message")
            ? agentConfig["typing_mode"]
            : "instant";

        // Show typing indicator while generating (instant mode only — thinking/message defer)
        if (typingMode === "instant") {
          await sendDiscordTypingIndicator(botToken, channelId);
        }

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
          context.run.id
        ).catch(() => null);

        const sendVisibleReply = async (
          content: string,
          options?: {
            dedupeKey?: string;
            visibility?: "progress" | "final";
            source?: "heartbeat" | "status" | "step" | "final";
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

          const sentChunk = trimmed.slice(0, 1900);
          const source = options?.source ?? "status";
          const visibility = options?.visibility ?? "progress";

          if (obligation && visibility !== "final") {
            const obligationEventType = source === "heartbeat" ? "heartbeat" : "tool_phase";
            if (obligationEventType === "heartbeat") {
              await recordObligationHeartbeat(admin, obligation.id, context.run.id, {
                source,
                content_preview: sentChunk.slice(0, 160),
              }).catch(() => {});
            } else {
              await recordObligationToolPhase(admin, obligation.id, context.run.id, {
                source,
                content_preview: sentChunk.slice(0, 160),
              }).catch(() => {});
            }

            obligation = await getObligationById(admin, obligation.id).catch(() => obligation);
            if (obligation) {
              const decision = shouldSendStatusUpdate(obligation, obligationEventType);
              if (!decision.shouldUpdate) {
                return false;
              }
            }
          }

          try {
            await sendDiscordChannelMessage(
              {
                botToken,
                channelId,
                content: sentChunk,
                replyToMessageId: inboundMessageId,
              },
              fetch
            );
            deliveredIntermediateChunks.push(sentChunk);
            lastUserVisibleActivityAt = Date.now();

            if (source !== "final") {
              progressUpdatesSentCount += 1;
            }

            if (obligation && visibility !== "final") {
              await recordUserUpdate(admin, obligation.id, context.run.id, {
                source,
                content_preview: sentChunk.slice(0, 160),
              }).catch(() => {});
              obligation = await getObligationById(admin, obligation.id).catch(() => obligation);
            }

            if (dedupeKey) {
              sentStatusKeys.add(dedupeKey);
            }
            return true;
          } catch (err) {
            console.error("[ai-worker] Intermediate Discord send failed:", safeErrorMessage(err));
            return false;
          }
        };

        heartbeatInterval = setInterval(async () => {
          if (
            obligation &&
            Date.now() - lastObligationHeartbeatAt > OBLIGATION_HEARTBEAT_UPDATE_MS
          ) {
            lastObligationHeartbeatAt = Date.now();
            recordObligationHeartbeat(admin, obligation.id, context.run.id, {
              source: "worker_heartbeat",
            }).catch(() => {});
          }

          const silenceMs = Date.now() - lastUserVisibleActivityAt;
          if (typingMode !== "message" && silenceMs > TYPING_REFRESH_INTERVAL_MS) {
            sendDiscordTypingIndicator(botToken, channelId).catch(() => {});
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

        // Thinking mode: start typing only after context assembly is complete
        if (typingMode === "thinking") {
          await sendDiscordTypingIndicator(botToken, channelId);
        }

        const result = await generateText({
          model: primaryModel,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          temperature: AI_CONFIG.temperature,
          system: assembled.systemPrompt,
          messages: assembled.messages,
          ...(hasTools ? { tools: resolvedTools, maxSteps: 5 } : {}),
          onStepFinish: async (step) => {
            // Track the last tool used for contextual progress messages
            if (step.toolCalls.length > 0) {
              lastToolPhase = step.toolCalls[step.toolCalls.length - 1].toolName;
            }

            // Send intermediate text when: step has text AND more steps follow AND not a cron run
            if (
              isCron ||
              step.finishReason !== "tool-calls" ||
              !step.text?.trim()
            ) {
              // Layer 3: send contextual status message for silent tool calls
              if (
                !isCron &&
                step.finishReason === "tool-calls" &&
                !step.text?.trim() &&
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
            sendDiscordTypingIndicator(botToken, channelId).catch(() => {});
          },
        });

        // Stop the activity heartbeat now that generation is complete
        clearInterval(heartbeatInterval);

        // Capture multi-step messages for history reconstruction
        const responseMessages = result.response?.messages ?? [];
        const inputTokens = result.totalUsage?.inputTokens ?? 0;
        const outputTokens = result.totalUsage?.outputTokens ?? 0;
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
          console.warn(`[ai-worker] Guardrail halt after model usage: ${usageGuardrailEvent.message}`);
        }

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
              const queryToolRecords = successfulRecords.filter((record) => {
                const name = record.toolName;
                return (
                  name.startsWith("memory_search") ||
                  name === "schedule_list" ||
                  name.startsWith("conversation_") ||
                  name === "config_view_my_config" ||
                  name === "integration_list" ||
                  name === "integration_templates"
                );
              });
              const allQuery = queryToolRecords.length > 0 && queryToolRecords.length === successfulRecords.length;

              // For query-only invocations, try to surface the tool output directly
              if (allQuery && successfulRecords.length > 0) {
                const output = successfulRecords[0].outputSummary;
                const formatted = formatQueryToolOutput(successfulRecords[0].toolName, output);
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

        const followUpDepth = typeof payload.follow_up_depth === "number" ? payload.follow_up_depth : 0;
        // Store outbound message
        await storeOutboundMessage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          agentId: assembled.agentId,
          content: responseText,
          tokenCount: inputTokens + outputTokens,
          toolCalls: responseMessages.length > 0
            ? responseMessages.map((m) => m as Record<string, unknown>)
            : undefined,
        }).catch((err) => {
          console.error("[ai-worker] Failed to store outbound message:", safeErrorMessage(err));
        });

        // Fire-and-forget session summarization (non-blocking, gated on autoCompress)
        if (assembled.memorySettings.autoCompress) {
          maybeGenerateSummary({
            admin,
            tenantId: context.run.tenant_id,
            customerId: context.run.customer_id,
            sessionId: assembled.sessionId,
            agentId: assembled.agentId ?? undefined,
            captureLevel: assembled.memorySettings.captureLevel,
            excludeCategories: assembled.memorySettings.excludeCategories,
            model: fastModel,
            contextWindowTokens,
          }).catch((err) => {
            console.error("[ai-worker] Session summarization failed:", safeErrorMessage(err));
          });
        }

        // Fire-and-forget: extract behavioral patterns (Feature 6)
        extractBehavioralPatterns(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          recentMessages: assembled.messages
            .filter((m) => "role" in m && (m.role === "user" || m.role === "assistant"))
            .map((m) => ({
              role: "role" in m ? String(m.role) : "user",
              content: "content" in m && typeof m.content === "string" ? m.content : "",
            })),
          existingPatterns: [],
          model: fastModel,
        }).catch((err) => {
          console.error("[ai-worker] Pattern extraction failed:", safeErrorMessage(err));
        });

        // Fire-and-forget: flush unified tool executor (invocations + telemetry)
        executor.flush().catch((err) => {
          console.error("[ai-worker] Unified executor flush failed:", safeErrorMessage(err));
        });

        // Fire-and-forget: record conversation trace (Feature 7)
        const totalLatencyMs = Date.now() - startTime;
        const browserSessions = await flushBrowserSessionsForRun(context.run.id);
        recordConversationTrace(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          runId: context.run.id,
          agentId: assembled.agentId,
          agentName: assembled.agentDisplayName,
          toolsAvailable: Object.keys(resolvedTools),
          toolsInvoked: executor.records.map((r) => {
            let inputSummary = r.inputSummary;
            if (redactor) inputSummary = redactor(inputSummary);
            return {
              name: r.toolName,
              input_summary: inputSummary,
              output_summary: r.success ? r.outputSummary : `error: ${r.errorClass}`,
            };
          }),
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
          console.error("[ai-worker] Trace recording failed:", safeErrorMessage(err));
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
          console.error("[ai-worker] Failed to record usage:", safeErrorMessage(err));
        });

        // Check if any tool was blocked by the approval gate — if so, the run
        // should park in awaiting_approval so the approval decision route can
        // resume it after the user approves.
        const hasApprovalRequired = executor.records.some(
          (r) => r.errorClass === "approval_required"
        );
        const approvalId = extractApprovalIdFromExecutorRecords(
          executor.records as unknown as readonly ExecutorRecordLike[]
        );
        const hasExplicitFollowUp = executor.records.some(
          (r) => r.toolName === "task_follow_up" && r.success
        );
        const toolSummary = executor.records
          .slice(0, 8)
          .map((r) => `${r.toolName}:${r.success ? "success" : r.errorClass ?? "error"}`)
          .join(", ");
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

        if (!skipFinalSend) {
          // Opt-in dedup guard: skip if this exact final reply was already sent
          // (protects against re-entrant execution of the same run)
          const isDuplicate = checkAndMarkFinalReply({
            runId: context.run.id,
            channelId,
            replyToMessageId: inboundMessageId,
            partIndex: 0,
            content: responseText,
          });
          if (isDuplicate) {
            skipFinalSend = true;
            console.log(`[ai-worker] Skipping duplicate final reply for run ${context.run.id}`);
          }
        }

        if (!skipFinalSend) {
          const responseParts = buildDiscordRuntimeResponseParts(responseText);
          const timeoutFetch: typeof fetch = async (url, init) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), governance.dispatch_timeout_ms);
            try {
              return await fetch(url, { ...init, signal: controller.signal });
            } finally {
              clearTimeout(timeout);
            }
          };

          // Collect any files created by file_create tool during this run
          const pendingFiles = context.run?.id ? collectPendingFiles(context.run.id) : [];

          if (pendingFiles.length > 0) {
            // Send text + file attachments together via multipart
            const attachmentText = responseParts.join("\n\n");
            sent = await runWithCircuitBreaker(
              `discord_dispatch:${context.run.tenant_id}`,
              async () => {
                const result = await sendDiscordChannelMessageWithFiles(
                  {
                    botToken,
                    channelId,
                    content: attachmentText.slice(0, 1900),
                    files: pendingFiles.map((f) => ({
                      name: f.fileName,
                      data: f.data,
                      contentType: f.contentType,
                    })),
                    replyToMessageId: inboundMessageId,
                  },
                  timeoutFetch
                );
                return {
                  messageIds: result.messageId ? [result.messageId] : [],
                  partsSent: 1,
                };
              },
              {
                failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
                cooldownMs: CIRCUIT_COOLDOWN_MS,
              }
            );
          } else {
            // Standard text-only send
            sent = await runWithCircuitBreaker(
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
                failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
                cooldownMs: CIRCUIT_COOLDOWN_MS,
              }
            );
          }
          finalReplySent = sent.partsSent > 0;
        }

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

        return {
          outcome: hasApprovalRequired ? "awaiting_approval" : "completed",
          result: runResult,
        };
      } catch (error) {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        await flushBrowserSessionsForRun(context.run.id).catch(() => []);
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
            discord_rate_limited: rateLimitError,
            discord_retry_after_seconds: retryAfterSeconds,
            processed_at: new Date().toISOString(),
          },
        };
      }
    },
  };
}
