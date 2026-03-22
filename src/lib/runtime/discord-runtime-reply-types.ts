import type { FileCreateResult } from "@/lib/ai/tools/file-create";

export const DISCORD_REPLY_ORCHESTRATOR_MODE_VALUES = [
  "active",
] as const;
export type DiscordReplyOrchestratorMode =
  (typeof DISCORD_REPLY_ORCHESTRATOR_MODE_VALUES)[number];

export const DISCORD_REPLY_LIFECYCLE_STATE_VALUES = [
  "idle",
  "active",
  "blocked_on_approval",
  "resumed_after_approval",
  "terminal",
] as const;
export type DiscordReplyLifecycleState =
  (typeof DISCORD_REPLY_LIFECYCLE_STATE_VALUES)[number];

export const DISCORD_VISIBLE_KIND_VALUES = [
  "milestone",
  "keepalive",
  "approval_blocked",
  "resumed",
  "terminal_answer",
  "terminal_summary",
  "terminal_failure",
] as const;
export type DiscordVisibleKind = (typeof DISCORD_VISIBLE_KIND_VALUES)[number];

export interface DiscordReplyLifecycleMetadata {
  state: DiscordReplyLifecycleState;
  phase_key: string | null;
  pending_file_names: string[];
  last_visible_kind: DiscordVisibleKind | null;
  last_visible_event_at: string | null;
  progress_count: number;
  keepalive_count: number;
  approval_cycle_sequence: number;
  current_approval_id: string | null;
  terminal_kind: "answer" | "summary" | "failure" | null;
  terminal_sent_at: string | null;
  sent_keys: string[];
  last_message_preview: string | null;
  pending_send_key: string | null;
  last_send_attempt_at: string | null;
  last_send_error: string | null;
  last_attachment_error: string | null;
  last_attachment_fallback_at: string | null;
}

export interface DiscordReplyNormalizedContent {
  text?: string;
  skip: boolean;
  skipReason?: "empty" | "silent" | "heartbeat";
}

export interface DiscordIntermediateTextClassification {
  action: "promote" | "suppress";
  reason: string;
}

export type DiscordRuntimeReplyEvent =
  | { type: "run_started" }
  | {
      type: "tool_phase";
      phaseKey: string;
      toolName?: string;
      label?: string;
      source?: string;
      isSilentTool?: boolean;
    }
  | {
      type: "intermediate_text";
      text: string;
      stepIndex: number;
      finishReason?: string;
      suppressedPreamble?: boolean;
    }
  | {
      type: "approval_requested";
      approvalId: string;
      toolKey?: string;
      reason?: string;
      requiredRole?: string;
    }
  | { type: "approval_granted"; approvalId: string; resumeRunId: string }
  | { type: "approval_rejected"; approvalId: string; reason?: string }
  | { type: "keepalive_tick" }
  | {
      type: "file_ready";
      fileId: string;
      filename: string;
      mimeType: string;
    }
  | {
      type: "delegation_started";
      targetAgentId: string;
      targetAgentName?: string;
    }
  | {
      type: "final_candidate";
      responseText: string;
      skipFinalSend: boolean;
      terminalState: "completed" | "continuing";
      toolSummary: string;
      progressUpdatesSentCount: number;
      pendingFiles?: FileCreateResult[];
    }
  | { type: "worker_failed"; errorMessage?: string | null }
  | { type: "run_reaped"; errorMessage?: string | null };

export function buildDefaultDiscordReplyLifecycleMetadata(): DiscordReplyLifecycleMetadata {
  return {
    state: "idle",
    phase_key: null,
    pending_file_names: [],
    last_visible_kind: null,
    last_visible_event_at: null,
    progress_count: 0,
    keepalive_count: 0,
    approval_cycle_sequence: 0,
    current_approval_id: null,
    terminal_kind: null,
    terminal_sent_at: null,
    sent_keys: [],
    last_message_preview: null,
    pending_send_key: null,
    last_send_attempt_at: null,
    last_send_error: null,
    last_attachment_error: null,
    last_attachment_fallback_at: null,
  };
}
