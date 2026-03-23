import { buildDiscordRuntimeResponseParts } from "./tenant-runtime-discord";
import {
  buildDefaultDiscordReplyLifecycleMetadata,
  type DiscordIntermediateTextClassification,
  type DiscordReplyLifecycleMetadata,
  type DiscordReplyNormalizedContent,
  type DiscordReplyOrchestratorMode,
  type DiscordVisibleKind,
} from "./discord-runtime-reply-types";

const SILENT_REPLY_TOKEN = "NO_REPLY";
const HEARTBEAT_TOKEN = "HEARTBEAT_OK";
const MIN_INTERMEDIATE_SUBSTANCE_LENGTH = 36;
const MILESTONE_MIN_SPACING_MS = 4_000;
const KEEPALIVE_SILENCE_MS = 30_000;
const KEEPALIVE_MIN_SPACING_MS = 45_000;
const MAX_KEEPALIVES_PER_RUN = 3;
export const FRIENDLY_TOOL_SUMMARY_MESSAGES: Record<string, string> = {
  schedule_create: "I set up the schedule.",
  schedule_update: "I updated the schedule.",
  schedule_delete: "I removed the schedule.",
  task_follow_up: "I scheduled the follow-up.",
  integration_register: "I set up the integration.",
  integration_store_credential: "I saved the credential securely.",
  config_create_agent: "I created the agent.",
  config_archive_agent: "I archived the agent.",
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickMultilineString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

function clampPreview(value: string, maxLength = 160): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function stripTerminalPrefix(value: string): string {
  return value.replace(/^task (?:complete|failed)\.?\s*/i, "").trim();
}

function looksLikeSentence(value: string): boolean {
  return /^(i\b|i'm\b|i’ve\b|still\b|approval\b|quick update\b|working\b|checking\b|reading\b|setting\b|updating\b|removing\b|creating\b|saving\b)/i.test(
    value.trim()
  );
}

function buildFriendlyToolSummary(toolSummary: string): string | null {
  const steps = toolSummary
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [toolNameRaw, statusRaw] = entry.split(":");
      const toolName = pickString(toolNameRaw)?.toLowerCase() ?? null;
      const status = pickString(statusRaw)?.toLowerCase() ?? null;
      return { toolName, status };
    })
    .filter(
      (entry): entry is { toolName: string; status: string | null } => entry.toolName !== null
    );

  const friendly = steps
    .filter((entry) => entry.status === "success")
    .map((entry) => {
      const direct = FRIENDLY_TOOL_SUMMARY_MESSAGES[entry.toolName];
      if (direct) {
        return direct;
      }

      if (entry.toolName.startsWith("schedule_")) {
        return "I updated the schedule.";
      }
      if (entry.toolName.startsWith("config_") || entry.toolName.startsWith("self_config_")) {
        return "I updated the configuration.";
      }
      if (entry.toolName === "integration_api_call") {
        return "I checked that through the API.";
      }
      if (entry.toolName === "web_search" || entry.toolName === "web_fetch") {
        return "I checked a couple of sources.";
      }

      return null;
    })
    .filter((entry): entry is string => typeof entry === "string");

  const unique = [...new Set(friendly)];
  if (unique.length === 0) {
    return null;
  }

  if (unique.length === 1) {
    return unique[0];
  }

  return `${unique[0].replace(/[.!?]$/, "")} and ${unique[1].replace(/[.!?]$/, "")}.`;
}

function stripKnownControlTokens(text: string): { text: string; skipReason?: "silent" | "heartbeat" } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: trimmed };
  }

  if (trimmed === SILENT_REPLY_TOKEN) {
    return { text: "", skipReason: "silent" };
  }

  if (trimmed === HEARTBEAT_TOKEN) {
    return { text: "", skipReason: "heartbeat" };
  }

  let next = text.replace(
    new RegExp(`^[ \\t]*(?:${SILENT_REPLY_TOKEN}|${HEARTBEAT_TOKEN})[ \\t]*\\n?`, "gm"),
    ""
  );
  next = next.replace(new RegExp(`\\b${SILENT_REPLY_TOKEN}\\b`, "g"), "");
  next = next.replace(new RegExp(`\\b${HEARTBEAT_TOKEN}\\b`, "g"), "");
  next = next.replace(/[ \t]{2,}/g, " ");
  next = next.replace(/[ \t]+\n/g, "\n");
  next = next.replace(/\n[ \t]+/g, "\n");
  return {
    text: next.trim(),
  };
}

function sanitizeUserFacingText(text: string): string {
  let next = text.replace(/\u0000/g, "");
  next = next.replace(/\r\n/g, "\n");
  next = next.replace(/[ \t]+\n/g, "\n");
  next = next.replace(/\n{3,}/g, "\n\n");
  return next.trim();
}

function similarEnough(left: string, right: string): boolean {
  const a = normalizeWhitespace(left).toLowerCase();
  const b = normalizeWhitespace(right).toLowerCase();
  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  return a.includes(b) || b.includes(a);
}

export function resolveDiscordReplyOrchestratorMode(): DiscordReplyOrchestratorMode {
  return "active";
}

export function getDiscordReplyOrchestratorMode(): DiscordReplyOrchestratorMode {
  return resolveDiscordReplyOrchestratorMode();
}

export function readDiscordReplyLifecycleMetadata(
  metadata?: Record<string, unknown>
): DiscordReplyLifecycleMetadata {
  const raw = metadata?.reply_lifecycle;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return buildDefaultDiscordReplyLifecycleMetadata();
  }

  const value = raw as Record<string, unknown>;
  const defaults = buildDefaultDiscordReplyLifecycleMetadata();
  const state =
    value.state === "idle" ||
    value.state === "active" ||
    value.state === "blocked_on_approval" ||
    value.state === "resumed_after_approval" ||
    value.state === "terminal"
      ? value.state
      : defaults.state;

  const lastVisibleKind =
    value.last_visible_kind === "milestone" ||
    value.last_visible_kind === "keepalive" ||
    value.last_visible_kind === "approval_blocked" ||
    value.last_visible_kind === "resumed" ||
    value.last_visible_kind === "terminal_answer" ||
    value.last_visible_kind === "terminal_summary" ||
    value.last_visible_kind === "terminal_failure"
      ? value.last_visible_kind
      : defaults.last_visible_kind;

  const terminalKind =
    value.terminal_kind === "answer" ||
    value.terminal_kind === "summary" ||
    value.terminal_kind === "failure"
      ? value.terminal_kind
      : defaults.terminal_kind;

  return {
    state,
    phase_key: pickString(value.phase_key),
    pending_file_names: Array.isArray(value.pending_file_names)
      ? value.pending_file_names.filter((entry): entry is string => typeof entry === "string")
      : defaults.pending_file_names,
    last_visible_kind: lastVisibleKind,
    last_visible_event_at: pickString(value.last_visible_event_at),
    progress_count:
      typeof value.progress_count === "number" ? value.progress_count : defaults.progress_count,
    keepalive_count:
      typeof value.keepalive_count === "number" ? value.keepalive_count : defaults.keepalive_count,
    approval_cycle_sequence:
      typeof value.approval_cycle_sequence === "number"
        ? value.approval_cycle_sequence
        : defaults.approval_cycle_sequence,
    current_approval_id: pickString(value.current_approval_id),
    terminal_kind: terminalKind,
    terminal_sent_at: pickString(value.terminal_sent_at),
    sent_keys: Array.isArray(value.sent_keys)
      ? value.sent_keys.filter((entry): entry is string => typeof entry === "string")
      : defaults.sent_keys,
    last_message_preview: pickString(value.last_message_preview),
    pending_send_key: pickString(value.pending_send_key),
    last_send_attempt_at: pickString(value.last_send_attempt_at),
    last_send_error: pickString(value.last_send_error),
    last_attachment_error: pickString(value.last_attachment_error),
    last_attachment_fallback_at: pickString(value.last_attachment_fallback_at),
  };
}

export function normalizeReplyContent(input: {
  text?: string;
  kind: string;
  responsePrefix?: string;
}): DiscordReplyNormalizedContent {
  const raw = pickMultilineString(input.text);
  if (!raw) {
    return { skip: true, skipReason: "empty" };
  }

  const stripped = stripKnownControlTokens(raw);
  if (stripped.skipReason && !pickString(stripped.text)) {
    return { skip: true, skipReason: stripped.skipReason };
  }

  const sanitized = sanitizeUserFacingText(stripped.text);
  if (!pickString(sanitized)) {
    return { skip: true, skipReason: "empty" };
  }

  if (input.responsePrefix && !sanitized.startsWith(input.responsePrefix)) {
    return {
      skip: false,
      text: `${input.responsePrefix} ${sanitized}`.trim(),
    };
  }

  return {
    skip: false,
    text: sanitized,
  };
}

export function resolvePhaseKey(toolName: string, toolSource?: string): string {
  const normalizedToolName = pickString(toolName)?.toLowerCase() ?? "";
  const normalizedSource = pickString(toolSource)?.toLowerCase() ?? "";

  if (!normalizedToolName) {
    return "generic_tool";
  }

  if (normalizedToolName === "integration_api_call") {
    return "api_call";
  }
  if (normalizedToolName === "web_search") {
    return "web_research";
  }
  if (normalizedToolName === "web_fetch") {
    return "web_read";
  }
  if (normalizedToolName.startsWith("memory_") || normalizedToolName.startsWith("conversation_")) {
    return "memory_lookup";
  }
  if (normalizedToolName.startsWith("browser_")) {
    return "browser_check";
  }
  if (normalizedToolName === "delegate_task" || normalizedToolName === "delegate_task_async") {
    return "delegation_wait";
  }
  if (
    normalizedToolName === "integration_register" ||
    normalizedToolName === "integration_store_credential"
  ) {
    return "integration_setup";
  }
  if (normalizedToolName.startsWith("schedule_")) {
    return "schedule_change";
  }
  if (normalizedToolName.startsWith("config_") || normalizedToolName.startsWith("self_config_")) {
    return "config_update";
  }
  if (normalizedSource === "mcp" || normalizedToolName.startsWith("mcp_") || normalizedToolName.startsWith("mcp.")) {
    return "mcp_tool";
  }
  if (normalizedSource === "skill" || normalizedToolName.startsWith("skill_")) {
    return "skill_execution";
  }

  return "generic_tool";
}

/** Phases that are routine single-tool operations — silent unless multi-step */
const SILENT_PHASES = new Set([
  "schedule_change",
  "config_update",
  "memory_lookup",
  "integration_setup",
]);

export function buildMilestoneMessage(input: {
  phaseKey: string;
  label?: string;
  targetAgentName?: string;
  isMultiStep?: boolean;
}): string | null {
  const phaseKey = resolvePhaseKey(input.phaseKey);

  // Routine single-tool operations don't need narration
  if (SILENT_PHASES.has(phaseKey) && !input.isMultiStep) {
    return null;
  }

  switch (phaseKey) {
    case "api_call":
      return "Checking the API now.";
    case "web_research":
      return "Checking a couple of sources now.";
    case "web_read":
      return "Reading through that now.";
    case "memory_lookup":
      return "Checking what I already know about that.";
    case "browser_check":
      return "Opening it directly so I can check.";
    case "delegation_wait":
      return input.targetAgentName
        ? `I've asked ${input.targetAgentName} to help with that part.`
        : "I've asked another agent to help with that part.";
    case "integration_setup":
      return "Setting up the integration now.";
    case "schedule_change":
      return "Updating the schedule now.";
    case "config_update":
      return "Making that change now.";
    case "mcp_tool":
      return "Checking that connected system now.";
    case "skill_execution":
      return "Running that workflow now.";
    default:
      if (input.label && looksLikeSentence(input.label)) {
        return ensureSentence(input.label);
      }
      return input.label
        ? ensureSentence(input.label)
        : "Working through that now.";
  }
}

export function buildKeepaliveMessage(phaseKey: string | null): string {
  switch (resolvePhaseKey(phaseKey ?? "generic_tool")) {
    case "api_call":
      return "Still waiting on the API to come back.";
    case "web_research":
      return "Still cross-checking a couple of sources.";
    case "web_read":
      return "Still reading through the details.";
    case "browser_check":
      return "Still checking it directly.";
    case "delegation_wait":
      return "Still waiting on the other agent's result.";
    case "schedule_change":
      return "Still getting the schedule updated.";
    default:
      return "Still on it. I'll post the result here once it's ready.";
  }
}

export function classifyIntermediateText(input: {
  text: string;
  priorMilestones?: string[];
}): DiscordIntermediateTextClassification {
  const normalized = normalizeWhitespace(input.text);
  if (!normalized) {
    return { action: "suppress", reason: "empty" };
  }

  if (/^(let me|i(?:'m| am| will|'ll) (?:try|check|look|look up|review|see|find|figure out|read|pull|fetch|go))/i.test(normalized)) {
    return { action: "suppress", reason: "hedging" };
  }

  if (normalized.length < MIN_INTERMEDIATE_SUBSTANCE_LENGTH && !/[0-9]/.test(normalized)) {
    return { action: "suppress", reason: "too_short" };
  }

  if (/^(done|great|okay|ok|thanks)\b/i.test(normalized) && normalized.length < 80) {
    return { action: "suppress", reason: "filler" };
  }

  if (Array.isArray(input.priorMilestones)) {
    for (const prior of input.priorMilestones) {
      if (similarEnough(prior, normalized)) {
        return { action: "suppress", reason: "overlap" };
      }
    }
  }

  return { action: "promote", reason: "substantive" };
}

export function isWeakProcessText(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return true;
  }

  if (/^(let me|i(?:'m| am| will|'ll) (?:check|look|try|review|see|read|fetch|figure out))/i.test(normalized)) {
    return true;
  }

  return /^(done!?|i checked that|i looked that up|i'm still working|i'll keep working)/i.test(
    normalized
  );
}

export function isStrongTerminalAnswer(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return false;
  }

  if (isWeakProcessText(normalized)) {
    return false;
  }

  if (/^(task complete|task failed)\b/i.test(normalized)) {
    return true;
  }

  if (/[0-9]/.test(normalized) && normalized.length >= 20) {
    return true;
  }

  if (normalized.length >= 60 && !/^(i need approval|approval received)\b/i.test(normalized)) {
    return true;
  }

  return false;
}

export function chunkReplyContent(text: string): string[] {
  return buildDiscordRuntimeResponseParts(text);
}

export function buildTerminalSummary(input: {
  responseText?: string;
  toolSummary?: string;
  responsePreview?: string | null;
  errorMessage?: string | null;
  status: "completed" | "failed";
}): string {
  if (input.status === "failed") {
    const detail = stripTerminalPrefix(
      pickString(input.errorMessage) ?? pickString(input.responsePreview) ?? ""
    );
    if (!detail) {
      return "I couldn't finish this run.";
    }

    if (/^i (?:couldn't|could not|wasn't able|ran into)\b/i.test(detail)) {
      return detail;
    }

    return `I couldn't finish this run. ${detail}`;
  }

  const responseTextRaw = pickString(input.responseText);
  const responseText = responseTextRaw ? stripTerminalPrefix(responseTextRaw) : null;
  if (responseText && !isWeakProcessText(responseText)) {
    return responseText;
  }

  const previewRaw = pickString(input.responsePreview);
  const preview = previewRaw ? stripTerminalPrefix(previewRaw) : null;
  if (preview) {
    return preview;
  }

  const toolSummary = pickString(input.toolSummary);
  if (toolSummary) {
    const friendlyToolSummary = buildFriendlyToolSummary(toolSummary);
    if (friendlyToolSummary) {
      return friendlyToolSummary;
    }
  }

  return "I finished that.";
}

export function shouldEmitKeepalive(input: {
  lifecycle: DiscordReplyLifecycleMetadata;
  now: Date;
}): boolean {
  if (input.lifecycle.state === "terminal" || input.lifecycle.state === "blocked_on_approval") {
    return false;
  }

  if (input.lifecycle.keepalive_count >= MAX_KEEPALIVES_PER_RUN) {
    return false;
  }

  const lastVisibleAt = input.lifecycle.last_visible_event_at
    ? new Date(input.lifecycle.last_visible_event_at).getTime()
    : 0;
  const nowMs = input.now.getTime();

  if (!lastVisibleAt || nowMs - lastVisibleAt < KEEPALIVE_SILENCE_MS) {
    return false;
  }

  return nowMs - lastVisibleAt >= KEEPALIVE_MIN_SPACING_MS;
}

export function shouldSendVisibleMessage(input: {
  lifecycle: DiscordReplyLifecycleMetadata;
  now: Date;
  sentKey: string;
  kind: DiscordVisibleKind;
}): { allowed: boolean; reason: string } {
  if (input.lifecycle.sent_keys.includes(input.sentKey)) {
    return { allowed: false, reason: "duplicate_key" };
  }

  if (input.lifecycle.state === "terminal") {
    return { allowed: false, reason: "terminal" };
  }

  if (input.lifecycle.state === "blocked_on_approval") {
    const allowedDuringBlock: DiscordVisibleKind[] = [
      "approval_blocked",
      "resumed",
      "terminal_answer",
      "terminal_summary",
      "terminal_failure",
    ];
    if (!allowedDuringBlock.includes(input.kind)) {
      return { allowed: false, reason: "blocked_on_approval" };
    }
  }

  if (input.kind === "approval_blocked" || input.kind === "resumed") {
    return { allowed: true, reason: "priority_lifecycle" };
  }

  const lastVisibleAt = input.lifecycle.last_visible_event_at
    ? new Date(input.lifecycle.last_visible_event_at).getTime()
    : 0;
  if (lastVisibleAt && input.now.getTime() - lastVisibleAt < MILESTONE_MIN_SPACING_MS) {
    return { allowed: false, reason: "cadence_window" };
  }

  return { allowed: true, reason: "ok" };
}

export function buildMessagePreview(text: string | null): string | null {
  const picked = pickString(text);
  return picked ? clampPreview(picked) : null;
}
