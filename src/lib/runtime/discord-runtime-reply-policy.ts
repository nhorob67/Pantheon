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
const MILESTONE_MIN_SPACING_MS = 1_000;
const KEEPALIVE_SILENCE_MS = 20_000;
const KEEPALIVE_MIN_SPACING_MS = 30_000;
const MAX_KEEPALIVES_PER_RUN = 3;
const FRIENDLY_TOOL_SUMMARY_MESSAGES: Record<string, string> = {
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
      const toolName = pickString(toolNameRaw)?.toLowerCase();
      const status = pickString(statusRaw)?.toLowerCase();
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
        return "I finished checking that through the API.";
      }
      if (entry.toolName === "web_search" || entry.toolName === "web_fetch") {
        return "I checked the relevant sources.";
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

  let next = text.replace(new RegExp(`\\b${SILENT_REPLY_TOKEN}\\b`, "g"), " ");
  next = next.replace(new RegExp(`\\b${HEARTBEAT_TOKEN}\\b`, "g"), " ");
  return {
    text: normalizeWhitespace(next),
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
  const raw = pickString(input.text);
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

export function buildMilestoneMessage(input: {
  phaseKey: string;
  label?: string;
  targetAgentName?: string;
}): string | null {
  const phaseKey = resolvePhaseKey(input.phaseKey);
  switch (phaseKey) {
    case "api_call":
      return "I'm making that API call now.";
    case "web_research":
      return "I'm checking a couple of sources so I can answer this cleanly.";
    case "web_read":
      return "I'm reading through that now.";
    case "memory_lookup":
      return "I'm checking what I already know about that.";
    case "browser_check":
      return "I'm opening it directly so I can check it myself.";
    case "delegation_wait":
      return input.targetAgentName
        ? `I've asked ${input.targetAgentName} to help with that part.`
        : "I've asked another agent to help with that part.";
    case "integration_setup":
      return "I'm getting the integration set up now.";
    case "schedule_change":
      return "I'm updating that schedule now.";
    case "config_update":
      return "I'm making that configuration change now.";
    case "mcp_tool":
      return "I'm checking that connected system now.";
    case "skill_execution":
      return "I'm running that workflow now.";
    default:
      if (input.label && looksLikeSentence(input.label)) {
        return ensureSentence(input.label);
      }
      return input.label
        ? ensureSentence(`I'm ${input.label}`)
        : "I'm working through that now.";
  }
}

export function buildKeepaliveMessage(phaseKey: string | null): string {
  switch (resolvePhaseKey(phaseKey ?? "generic_tool")) {
    case "api_call":
      return "Still waiting on the API response. I'll post the result here as soon as it comes back.";
    case "web_research":
      return "I'm still cross-checking the sources so I can give you the right answer.";
    case "web_read":
      return "I'm still reading through the details.";
    case "browser_check":
      return "I'm still checking it directly.";
    case "delegation_wait":
      return "I'm still waiting on that other agent's result.";
    case "schedule_change":
      return "I'm still getting that schedule change into place.";
    default:
      return "Still on it. I'll report back here with the result.";
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
    const detail = pickString(input.errorMessage) ?? pickString(input.responsePreview);
    return detail ? `Task failed. ${detail}` : "Task failed. I couldn't finish this run.";
  }

  const responseText = pickString(input.responseText);
  if (responseText && !isWeakProcessText(responseText)) {
    return /^task complete\b/i.test(responseText)
      ? responseText
      : `Task complete. ${responseText}`;
  }

  const preview = pickString(input.responsePreview);
  if (preview) {
    return /^task complete\b/i.test(preview) ? preview : `Task complete. ${preview}`;
  }

  const toolSummary = pickString(input.toolSummary);
  if (toolSummary) {
    const friendlyToolSummary = buildFriendlyToolSummary(toolSummary);
    if (friendlyToolSummary) {
      return /^task complete\b/i.test(friendlyToolSummary)
        ? friendlyToolSummary
        : `Task complete. ${friendlyToolSummary}`;
    }
  }

  return "Task complete.";
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
