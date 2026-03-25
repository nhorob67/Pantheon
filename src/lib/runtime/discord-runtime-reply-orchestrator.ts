import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileCreateResult } from "@/lib/ai/tools/file-create";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { logSilentCatch } from "@/lib/telemetry/silent-catch";
import {
  patchTenantRuntimeRunMetadata,
  type TenantRuntimeQueueError,
} from "./tenant-runtime-queue";
import {
  sendDiscordChannelMessage,
  sendDiscordChannelMessageSequence,
  sendDiscordChannelMessageWithFiles,
  sendDiscordTypingIndicator,
} from "./tenant-runtime-discord";
import { runWithCircuitBreaker } from "./tenant-runtime-circuit-breaker";
import {
  type DiscordReplyLifecycleMetadata,
  type DiscordReplyOrchestratorMode,
  type DiscordVisibleKind,
} from "./discord-runtime-reply-types";
import {
  buildKeepaliveMessage,
  buildMessagePreview,
  buildMilestoneMessage,
  buildTerminalSummary,
  chunkReplyContent,
  classifyIntermediateText,
  isStrongTerminalAnswer,
  normalizeReplyContent,
  readDiscordReplyLifecycleMetadata,
  shouldEmitKeepalive,
  shouldSendVisibleMessage,
} from "./discord-runtime-reply-policy";
import { resolveDiscordBotToken } from "./tenant-runtime-discord-lifecycle";

const DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD = 3;
const DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS = 30_000;
const DISCORD_TYPING_REFRESH_MS = 8_000;
const CHANNEL_VISIBILITY_LEASE_MS = 60_000;
const TERMINAL_SENT_KEY = "terminal";

interface DiscordVisibleChannelOwner {
  runId: string;
  priority: number;
  expiresAt: number;
}

const visibleChannelOwners = new Map<string, DiscordVisibleChannelOwner>();
const MAX_VISIBLE_CHANNEL_OWNERS = 1000;

// Periodic cleanup: evict expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, owner] of visibleChannelOwners) {
    if (owner.expiresAt < now) {
      visibleChannelOwners.delete(key);
    }
  }
}, 60_000).unref();

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

/**
 * Only return message IDs that are valid Discord snowflakes (numeric strings).
 * Synthetic IDs like "cron-..." cause 400 Invalid Form Body from the Discord API.
 */
function sanitizeDiscordMessageRef(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return /^\d+$/.test(value) ? value : null;
}

function updateLifecycle(
  lifecycle: DiscordReplyLifecycleMetadata,
  patch: Partial<DiscordReplyLifecycleMetadata>
): DiscordReplyLifecycleMetadata {
  return {
    ...lifecycle,
    ...patch,
  };
}

function resolveRunVisibilityPriority(run: TenantRuntimeRun): number {
  const payloadRunKind =
    typeof run.payload.run_kind === "string" ? run.payload.run_kind : null;

  if (payloadRunKind === "discord_follow_up" || payloadRunKind === "discord_cron") {
    return 1;
  }

  return 2;
}

export interface DiscordRuntimeReplyOrchestratorOptions {
  admin: SupabaseClient;
  run: TenantRuntimeRun;
  botToken: string;
  channelId: string;
  replyToMessageId?: string | null;
  responsePrefix?: string;
  fetchImpl?: typeof fetch;
  persistRunMetadata?: (
    admin: SupabaseClient,
    run: TenantRuntimeRun,
    patch: Record<string, unknown>
  ) => Promise<TenantRuntimeRun>;
  transport?: {
    sendMessage?: typeof sendDiscordChannelMessage;
    sendMessageSequence?: typeof sendDiscordChannelMessageSequence;
    sendMessageWithFiles?: typeof sendDiscordChannelMessageWithFiles;
    sendTypingIndicator?: typeof sendDiscordTypingIndicator;
  };
}

export interface DiscordRuntimeFinalizationInput {
  responseText: string;
  skipFinalSend: boolean;
  terminalState: "completed" | "continuing";
  toolSummary: string;
  progressUpdatesSentCount: number;
  pendingFiles?: FileCreateResult[];
}

export interface DiscordRuntimeFinalizationResult {
  finalReplySent: boolean;
  terminalKind: "answer" | "summary" | "failure";
  text: string;
}

export interface DiscordRuntimeTerminalSuccessDispatchResult {
  owned: boolean;
  sent: boolean;
  terminalKind: "answer" | "summary" | "failure";
  text: string;
  messageIds: string[];
  partsSent: number;
}

export interface DiscordRuntimeTerminalFailureDispatchResult {
  owned: boolean;
  sent: boolean;
}

interface DiscordRuntimeTerminalDispatchTransport {
  sendMessage?: typeof sendDiscordChannelMessage;
  sendMessageSequence?: typeof sendDiscordChannelMessageSequence;
  sendMessageWithFiles?: typeof sendDiscordChannelMessageWithFiles;
  sendTypingIndicator?: typeof sendDiscordTypingIndicator;
}

interface DiscordRuntimeTerminalSuccessDispatchOptions
  extends DiscordRuntimeFinalizationInput {
  channelId?: string | null;
  replyToMessageId?: string | null;
  responsePrefix?: string;
  fetchImpl?: typeof fetch;
  persistRunMetadata?: (
    admin: SupabaseClient,
    run: TenantRuntimeRun,
    patch: Record<string, unknown>
  ) => Promise<TenantRuntimeRun>;
  transport?: DiscordRuntimeTerminalDispatchTransport;
}

interface DiscordRuntimeTerminalFailureDispatchOptions {
  channelId?: string | null;
  replyToMessageId?: string | null;
  errorMessage?: string | null;
  responsePrefix?: string;
  fetchImpl?: typeof fetch;
  persistRunMetadata?: (
    admin: SupabaseClient,
    run: TenantRuntimeRun,
    patch: Record<string, unknown>
  ) => Promise<TenantRuntimeRun>;
  transport?: DiscordRuntimeTerminalDispatchTransport;
}

function resolveSuccessfulTerminalReply(input: {
  responseText: string;
  skipFinalSend: boolean;
  terminalState: "completed" | "continuing";
  toolSummary: string;
  responsePreview?: string | null;
  responsePrefix?: string;
}): Pick<DiscordRuntimeFinalizationResult, "terminalKind" | "text"> {
  const normalized = normalizeReplyContent({
    text: input.responseText,
    kind: "final",
    responsePrefix: input.responsePrefix,
  });
  const responseText = normalized.skip ? "" : normalized.text ?? "";
  const cleanedResponseText = responseText.replace(/^task complete\.?\s*/i, "").trim();
  const shouldUseAnswer =
    !input.skipFinalSend &&
    input.terminalState === "completed" &&
    isStrongTerminalAnswer(cleanedResponseText);

  const terminalKind = shouldUseAnswer ? "answer" : "summary";
  const text = shouldUseAnswer
    ? cleanedResponseText
    : buildTerminalSummary({
        responseText: cleanedResponseText,
        toolSummary: input.toolSummary,
        responsePreview: input.responsePreview,
        status: "completed",
      });

  return {
    terminalKind,
    text,
  };
}

function buildAttachmentReplyContent(text: string): string {
  const firstPart = chunkReplyContent(text)[0];
  return firstPart ?? text.slice(0, 1900);
}

export class DiscordRuntimeReplyOrchestrator {
  private admin: SupabaseClient;
  private run: TenantRuntimeRun;
  private botToken: string;
  private channelId: string;
  private replyToMessageId: string | null;
  private responsePrefix?: string;
  private fetchImpl: typeof fetch;
  private persistRunMetadata: (
    admin: SupabaseClient,
    run: TenantRuntimeRun,
    patch: Record<string, unknown>
  ) => Promise<TenantRuntimeRun>;
  private sendMessage: typeof sendDiscordChannelMessage;
  private sendMessageSequence: typeof sendDiscordChannelMessageSequence;
  private sendMessageWithFiles: typeof sendDiscordChannelMessageWithFiles;
  private sendTypingIndicator: typeof sendDiscordTypingIndicator;
  private lifecycle: DiscordReplyLifecycleMetadata;
  private visibleMessages: string[] = [];
  private typingSealed = false;
  private lastTypingIndicatorAt = 0;

  constructor(options: DiscordRuntimeReplyOrchestratorOptions) {
    this.admin = options.admin;
    this.run = options.run;
    this.botToken = options.botToken;
    this.channelId = options.channelId;
    this.replyToMessageId = options.replyToMessageId ?? null;
    this.responsePrefix = options.responsePrefix;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.persistRunMetadata = options.persistRunMetadata ?? patchTenantRuntimeRunMetadata;
    this.sendMessage = options.transport?.sendMessage ?? sendDiscordChannelMessage;
    this.sendMessageSequence =
      options.transport?.sendMessageSequence ?? sendDiscordChannelMessageSequence;
    this.sendMessageWithFiles =
      options.transport?.sendMessageWithFiles ?? sendDiscordChannelMessageWithFiles;
    this.sendTypingIndicator =
      options.transport?.sendTypingIndicator ?? sendDiscordTypingIndicator;
    this.lifecycle = readDiscordReplyLifecycleMetadata(options.run.metadata);
  }

  getMode(): DiscordReplyOrchestratorMode {
    return "active";
  }

  isActive(): boolean {
    return true;
  }

  isEnabled(): boolean {
    return true;
  }

  isTypingSealed(): boolean {
    return this.typingSealed;
  }

  getLifecycle(): DiscordReplyLifecycleMetadata {
    return this.lifecycle;
  }

  getVisibleMessages(): readonly string[] {
    return this.visibleMessages;
  }

  async refreshTyping(): Promise<boolean> {
    if (this.typingSealed) {
      return false;
    }

    if (
      this.lifecycle.state === "blocked_on_approval" ||
      this.lifecycle.state === "terminal"
    ) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastTypingIndicatorAt < DISCORD_TYPING_REFRESH_MS) {
      return false;
    }

    if (!this.canOwnConversationalVisibility()) {
      return false;
    }

    try {
      await this.sendTypingIndicator(this.botToken, this.channelId, this.fetchImpl);
      this.lastTypingIndicatorAt = now;
      this.markConversationalOwnership(true, false);
      return true;
    } catch {
      return false;
    }
  }

  sealTyping(): void {
    this.typingSealed = true;
  }

  async emitToolPhase(input: {
    phaseKey: string;
    label?: string;
    sentKey?: string;
    isMultiStep?: boolean;
  }): Promise<boolean> {
    const message = buildMilestoneMessage({
      phaseKey: input.phaseKey,
      label: input.label,
      isMultiStep: input.isMultiStep,
    });
    if (!message) {
      return false;
    }

    const sentKey = input.sentKey ?? `phase:${input.phaseKey}`;
    return this.emitVisibleText({
      text: message,
      kind: "milestone",
      sentKey,
      nextState: "active",
      nextPhaseKey: input.phaseKey,
      acquireChannelVisibility: true,
    });
  }

  async emitDelegationStarted(targetAgentName?: string): Promise<boolean> {
    const message = buildMilestoneMessage({
      phaseKey: "delegation_wait",
      targetAgentName,
    });
    return this.emitVisibleText({
      text: message,
      kind: "milestone",
      sentKey: `delegation:${targetAgentName ?? "unknown"}`,
      nextState: "active",
      nextPhaseKey: "delegation_wait",
      acquireChannelVisibility: true,
    });
  }

  async emitFileReady(input: {
    filename: string;
  }): Promise<boolean> {
    const filename = pickString(input.filename);
    if (!filename) {
      return false;
    }

    if (!this.lifecycle.pending_file_names.includes(filename)) {
      this.lifecycle = updateLifecycle(this.lifecycle, {
        pending_file_names: [...this.lifecycle.pending_file_names, filename],
      });
      await this.persistLifecycle().catch((e) => logSilentCatch("persist-lifecycle", e));
    }

    return this.emitVisibleText({
      text: `I've got ${filename} ready. I'll attach it with the result.`,
      kind: "milestone",
      sentKey: `file_ready:${filename}`,
      nextState: "active",
      nextPhaseKey: this.lifecycle.phase_key,
      acquireChannelVisibility: true,
    });
  }

  async emitIntermediateText(text: string): Promise<boolean> {
    const classification = classifyIntermediateText({
      text,
      priorMilestones: this.visibleMessages,
    });
    if (classification.action !== "promote") {
      return false;
    }

    return this.emitVisibleText({
      text,
      kind: "milestone",
      sentKey: `intermediate:${classification.reason}:${this.visibleMessages.length}`,
      nextState: "active",
      nextPhaseKey: this.lifecycle.phase_key,
      acquireChannelVisibility: true,
    });
  }

  async emitKeepalive(): Promise<boolean> {
    if (
      !shouldEmitKeepalive({
        lifecycle: this.lifecycle,
        now: new Date(),
      })
    ) {
      return false;
    }

    return this.emitVisibleText({
      text: buildKeepaliveMessage(this.lifecycle.phase_key),
      kind: "keepalive",
      sentKey: `keepalive:${this.lifecycle.keepalive_count + 1}`,
      nextState: "active",
      nextPhaseKey: this.lifecycle.phase_key,
      acquireChannelVisibility: true,
    });
  }

  async emitApprovalRequested(input: {
    approvalId: string;
    requiredRole?: string;
    reason?: string;
  }): Promise<boolean> {
    if (this.lifecycle.current_approval_id === input.approvalId) {
      return false;
    }

    const roleText = pickString(input.requiredRole);
    const message = roleText
      ? `This needs ${roleText} approval before I can proceed.`
      : "This needs approval before I can proceed.";

    const sent = await this.emitVisibleText({
      text: message,
      kind: "approval_blocked",
      sentKey: `approval_blocked:${input.approvalId}`,
      nextState: "blocked_on_approval",
      nextPhaseKey: null,
      releaseChannelVisibility: true,
      metadataPatch: {
        current_approval_id: input.approvalId,
        approval_cycle_sequence: this.lifecycle.approval_cycle_sequence + 1,
      },
    });
    return sent;
  }

  async emitApprovalGranted(input: {
    approvalId: string;
    allowFallback?: boolean;
  }): Promise<boolean> {
    const sentKey = `approval_resumed:${input.approvalId}`;
    if (
      this.lifecycle.current_approval_id !== input.approvalId &&
      input.allowFallback !== true
    ) {
      return false;
    }

    if (this.lifecycle.terminal_sent_at || this.lifecycle.sent_keys.includes(sentKey)) {
      return false;
    }

    return this.emitVisibleText({
      text: "Got it, picking back up.",
      kind: "resumed",
      sentKey,
      nextState: "resumed_after_approval",
      nextPhaseKey: this.lifecycle.phase_key,
      acquireChannelVisibility: true,
      metadataPatch: {
        current_approval_id: null,
      },
    });
  }

  async finalizeSuccess(input: DiscordRuntimeFinalizationInput): Promise<DiscordRuntimeFinalizationResult> {
    const { terminalKind, text } = resolveSuccessfulTerminalReply({
      responseText: input.responseText,
      skipFinalSend: input.skipFinalSend,
      terminalState: input.terminalState,
      toolSummary: input.toolSummary,
      responsePreview: pickString(this.run.result.response_preview),
      responsePrefix: this.responsePrefix,
    });

    const finalReplySent = await this.emitTerminalText({
      text,
      kind: terminalKind === "answer" ? "terminal_answer" : "terminal_summary",
      sentKey: TERMINAL_SENT_KEY,
      terminalKind,
      pendingFiles: input.pendingFiles,
    });

    return {
      finalReplySent,
      terminalKind,
      text,
    };
  }

  async finalizeFailure(errorMessage?: string | null): Promise<DiscordRuntimeFinalizationResult> {
    const text = buildTerminalSummary({
      errorMessage,
      responsePreview: pickString(this.run.result.response_preview),
      status: "failed",
    });
    const finalReplySent = await this.emitTerminalText({
      text,
      kind: "terminal_failure",
      sentKey: TERMINAL_SENT_KEY,
      terminalKind: "failure",
    });

    return {
      finalReplySent,
      terminalKind: "failure",
      text,
    };
  }

  private getChannelOwner(now = Date.now()): DiscordVisibleChannelOwner | null {
    const owner = visibleChannelOwners.get(this.channelId);
    if (!owner) {
      return null;
    }

    if (owner.expiresAt <= now) {
      visibleChannelOwners.delete(this.channelId);
      return null;
    }

    return owner;
  }

  private canOwnConversationalVisibility(now = Date.now()): boolean {
    const owner = this.getChannelOwner(now);
    if (!owner) {
      return true;
    }

    if (owner.runId === this.run.id) {
      return true;
    }

    return resolveRunVisibilityPriority(this.run) > owner.priority;
  }

  private canOwnChannelVisibility(kind: DiscordVisibleKind): boolean {
    if (
      kind === "approval_blocked" ||
      kind === "terminal_answer" ||
      kind === "terminal_summary" ||
      kind === "terminal_failure"
    ) {
      return true;
    }

    return this.canOwnConversationalVisibility();
  }

  private markConversationalOwnership(acquire: boolean, release: boolean): void {
    const owner = this.getChannelOwner();
    if (release && owner?.runId === this.run.id) {
      visibleChannelOwners.delete(this.channelId);
      return;
    }

    if (acquire) {
      // Evict oldest entry if at capacity
      if (visibleChannelOwners.size >= MAX_VISIBLE_CHANNEL_OWNERS) {
        const firstKey = visibleChannelOwners.keys().next().value;
        if (firstKey !== undefined) visibleChannelOwners.delete(firstKey);
      }
      visibleChannelOwners.set(this.channelId, {
        runId: this.run.id,
        priority: resolveRunVisibilityPriority(this.run),
        expiresAt: Date.now() + CHANNEL_VISIBILITY_LEASE_MS,
      });
    }
  }

  private markChannelOwnership(kind: DiscordVisibleKind, acquire: boolean, release: boolean): void {
    if (
      kind === "approval_blocked" ||
      kind === "terminal_answer" ||
      kind === "terminal_summary" ||
      kind === "terminal_failure"
    ) {
      this.markConversationalOwnership(false, true);
      return;
    }

    this.markConversationalOwnership(acquire, release);
  }

  private async emitVisibleText(input: {
    text: string | null;
    kind: DiscordVisibleKind;
    sentKey: string;
    nextState: DiscordReplyLifecycleMetadata["state"];
    nextPhaseKey: string | null;
    acquireChannelVisibility?: boolean;
    releaseChannelVisibility?: boolean;
    metadataPatch?: Partial<DiscordReplyLifecycleMetadata>;
  }): Promise<boolean> {
    const normalized = normalizeReplyContent({
      text: input.text ?? undefined,
      kind: input.kind,
      responsePrefix: this.responsePrefix,
    });
    if (normalized.skip || !normalized.text) {
      return false;
    }

    if (!this.canOwnChannelVisibility(input.kind)) {
      return false;
    }

    const permission = shouldSendVisibleMessage({
      lifecycle: this.lifecycle,
      now: new Date(),
      sentKey: input.sentKey,
      kind: input.kind,
    });
    if (!permission.allowed) {
      return false;
    }

    const sent = await this.sendText(normalized.text, input.sentKey, input.kind);
    if (!sent) {
      return false;
    }

    const nowIso = new Date().toISOString();
    this.lifecycle = updateLifecycle(this.lifecycle, {
      ...input.metadataPatch,
      state: input.nextState,
      phase_key: input.nextPhaseKey,
      last_visible_kind: input.kind,
      last_visible_event_at: nowIso,
      progress_count:
        input.kind === "keepalive"
          ? this.lifecycle.progress_count
          : this.lifecycle.progress_count + 1,
      keepalive_count:
        input.kind === "keepalive"
          ? this.lifecycle.keepalive_count + 1
          : this.lifecycle.keepalive_count,
      sent_keys: [...this.lifecycle.sent_keys, input.sentKey],
      last_message_preview: buildMessagePreview(normalized.text),
      pending_send_key: null,
      last_send_attempt_at: nowIso,
      last_send_error: null,
    });

    this.markChannelOwnership(
      input.kind,
      input.acquireChannelVisibility === true,
      input.releaseChannelVisibility === true
    );
    this.visibleMessages.push(normalized.text);
    await this.persistLifecycle();
    return true;
  }

  private async emitTerminalText(input: {
    text: string;
    kind: DiscordVisibleKind;
    sentKey: string;
    terminalKind: "answer" | "summary" | "failure";
    pendingFiles?: FileCreateResult[];
  }): Promise<boolean> {
    if (this.lifecycle.sent_keys.includes(input.sentKey) || this.lifecycle.terminal_sent_at) {
      return false;
    }

    const normalized = normalizeReplyContent({
      text: input.text,
      kind: input.kind,
      responsePrefix: this.responsePrefix,
    });
    if (normalized.skip || !normalized.text) {
      return false;
    }

    const sent = await this.sendTerminal(normalized.text, input.sentKey, input.pendingFiles);
    if (!sent) {
      return false;
    }

    const nowIso = new Date().toISOString();
    this.lifecycle = updateLifecycle(this.lifecycle, {
      state: "terminal",
      pending_file_names: [],
      last_visible_kind: input.kind,
      last_visible_event_at: nowIso,
      terminal_kind: input.terminalKind,
      terminal_sent_at: nowIso,
      sent_keys: [...this.lifecycle.sent_keys, input.sentKey],
      last_message_preview: buildMessagePreview(normalized.text),
      pending_send_key: null,
      last_send_attempt_at: nowIso,
      last_send_error: null,
    });
    this.sealTyping();
    this.markChannelOwnership(input.kind, false, true);
    await this.persistLifecycle();
    return true;
  }

  private async sendText(
    text: string,
    sentKey: string,
    kind: DiscordVisibleKind
  ): Promise<boolean> {
    const nowIso = new Date().toISOString();
    this.lifecycle = updateLifecycle(this.lifecycle, {
      pending_send_key: sentKey,
      last_send_attempt_at: nowIso,
      last_send_error: null,
    });
    await this.persistLifecycle().catch((e) => logSilentCatch("persist-lifecycle", e));

    try {
      await runWithCircuitBreaker(
        `discord_reply_orchestrator:${this.run.tenant_id}`,
        () =>
          this.sendMessage(
            {
              botToken: this.botToken,
              channelId: this.channelId,
              content: text,
              replyToMessageId: this.replyToMessageId,
            },
            this.fetchImpl
          ),
        {
          failureThreshold: DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD,
          cooldownMs: DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS,
        }
      );
      return true;
    } catch (error) {
      await this.recordDeliveryFailure(sentKey, safeErrorMessage(error, `Failed to send ${kind}`));
      return false;
    }
  }

  private async sendTerminal(
    text: string,
    sentKey: string,
    pendingFiles?: FileCreateResult[]
  ): Promise<boolean> {
    const nowIso = new Date().toISOString();
    this.lifecycle = updateLifecycle(this.lifecycle, {
      pending_send_key: sentKey,
      last_send_attempt_at: nowIso,
      last_send_error: null,
    });
    await this.persistLifecycle().catch((e) => logSilentCatch("persist-lifecycle", e));

    try {
      await runWithCircuitBreaker(
        `discord_reply_orchestrator:${this.run.tenant_id}`,
        async () => {
          if (Array.isArray(pendingFiles) && pendingFiles.length > 0) {
            try {
              const result = await this.sendMessageWithFiles(
                {
                  botToken: this.botToken,
                  channelId: this.channelId,
                  content: buildAttachmentReplyContent(text),
                  files: pendingFiles.map((file) => ({
                    name: file.fileName,
                    data: file.data,
                    contentType: file.contentType,
                  })),
                  replyToMessageId: this.replyToMessageId,
                },
                this.fetchImpl
              );
              return {
                messageIds: result.messageId ? [result.messageId] : [],
                partsSent: 1,
              };
            } catch (error) {
              await this.recordAttachmentFallback(
                safeErrorMessage(error, "Failed to send terminal reply with attachments")
              );
            }
          }

          return this.sendMessageSequence(
            {
              botToken: this.botToken,
              channelId: this.channelId,
              contents: chunkReplyContent(text),
              replyToMessageId: this.replyToMessageId,
            },
            this.fetchImpl
          );
        },
        {
          failureThreshold: DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD,
          cooldownMs: DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS,
        }
      );
      return true;
    } catch (error) {
      await this.recordDeliveryFailure(sentKey, safeErrorMessage(error, "Failed to send terminal reply"));
      return false;
    }
  }

  private async recordAttachmentFallback(message: string): Promise<void> {
    this.lifecycle = updateLifecycle(this.lifecycle, {
      last_attachment_error: message,
      last_attachment_fallback_at: new Date().toISOString(),
    });
    await this.persistLifecycle().catch((e) => logSilentCatch("persist-lifecycle", e));
  }

  private async recordDeliveryFailure(sentKey: string, message: string): Promise<void> {
    this.lifecycle = updateLifecycle(this.lifecycle, {
      pending_send_key: null,
      last_send_error: message,
      last_send_attempt_at: new Date().toISOString(),
    });
    await this.persistLifecycle().catch((e) => logSilentCatch("persist-lifecycle", e));
    console.error(`[discord-reply-orchestrator] ${sentKey}: ${message}`);
  }

  private async persistLifecycle(): Promise<void> {
    const patched = await this.persistRunMetadata(this.admin, this.run, {
      reply_lifecycle: this.lifecycle,
    }).catch((error: TenantRuntimeQueueError | Error) => {
      throw error;
    });
    this.run = patched;
  }
}

export function discordRuntimeReplyHasTerminalVisibility(run: TenantRuntimeRun): boolean {
  const lifecycle = readDiscordReplyLifecycleMetadata(run.metadata);
  return typeof lifecycle.terminal_sent_at === "string" && lifecycle.terminal_sent_at.length > 0;
}

export async function dispatchDiscordRuntimeTerminalSuccess(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  input: DiscordRuntimeTerminalSuccessDispatchOptions
): Promise<DiscordRuntimeTerminalSuccessDispatchResult> {
  if (run.run_kind !== "discord_runtime") {
    return {
      owned: false,
      sent: false,
      terminalKind: "summary",
      text: input.responseText,
      messageIds: [],
      partsSent: 0,
    };
  }

  const channelId = pickString(input.channelId ?? run.payload.channel_id);
  if (!channelId) {
    return {
      owned: false,
      sent: false,
      terminalKind: "summary",
      text: input.responseText,
      messageIds: [],
      partsSent: 0,
    };
  }

  const botToken = await resolveDiscordBotToken(admin, run.tenant_id);
  if (!botToken) {
    return {
      owned: false,
      sent: false,
      terminalKind: "summary",
      text: input.responseText,
      messageIds: [],
      partsSent: 0,
    };
  }

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin,
    run,
    botToken,
    channelId,
    replyToMessageId: input.replyToMessageId ?? sanitizeDiscordMessageRef(run.payload.message_id),
    responsePrefix: input.responsePrefix,
    fetchImpl: input.fetchImpl,
    persistRunMetadata: input.persistRunMetadata,
    transport: input.transport,
  });

  const result = await orchestrator.finalizeSuccess(input);

  return {
    owned: true,
    sent: result.finalReplySent,
    terminalKind: result.terminalKind,
    text: result.text,
    messageIds: [],
    partsSent: result.finalReplySent ? 1 : 0,
  };
}

export async function dispatchDiscordRuntimeTerminalFailure(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  input?: DiscordRuntimeTerminalFailureDispatchOptions
): Promise<DiscordRuntimeTerminalFailureDispatchResult> {
  if (run.run_kind !== "discord_runtime") {
    return {
      owned: false,
      sent: false,
    };
  }

  if (discordRuntimeReplyHasTerminalVisibility(run)) {
    return {
      owned: true,
      sent: false,
    };
  }

  const channelId = pickString(input?.channelId ?? run.payload.channel_id);
  if (!channelId) {
    return {
      owned: false,
      sent: false,
    };
  }

  const botToken = await resolveDiscordBotToken(admin, run.tenant_id);
  if (!botToken) {
    return {
      owned: false,
      sent: false,
    };
  }

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin,
    run,
    botToken,
    channelId,
    replyToMessageId: input?.replyToMessageId ?? sanitizeDiscordMessageRef(run.payload.message_id),
    responsePrefix: input?.responsePrefix,
    fetchImpl: input?.fetchImpl,
    persistRunMetadata: input?.persistRunMetadata,
    transport: input?.transport,
  });

  const result = await orchestrator.finalizeFailure(input?.errorMessage ?? run.error_message);

  return {
    owned: true,
    sent: result.finalReplySent,
  };
}

export async function emitDiscordRuntimeTerminalFailure(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  input?: DiscordRuntimeTerminalFailureDispatchOptions
): Promise<DiscordRuntimeTerminalFailureDispatchResult> {
  if (run.run_kind === "discord_runtime" && discordRuntimeReplyHasTerminalVisibility(run)) {
    return {
      owned: true,
      sent: false,
    };
  }

  const channelId = pickString(input?.channelId ?? run.payload.channel_id);
  if (!channelId || run.run_kind !== "discord_runtime") {
    return {
      owned: false,
      sent: false,
    };
  }

  const botToken = await resolveDiscordBotToken(admin, run.tenant_id);
  if (!botToken) {
    return {
      owned: false,
      sent: false,
    };
  }

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin,
    run,
    botToken,
    channelId,
    replyToMessageId: input?.replyToMessageId ?? sanitizeDiscordMessageRef(run.payload.message_id),
    responsePrefix: input?.responsePrefix,
    fetchImpl: input?.fetchImpl,
    persistRunMetadata: input?.persistRunMetadata,
    transport: input?.transport,
  });

  const result = await orchestrator.finalizeFailure(input?.errorMessage ?? run.error_message);
  return {
    owned: true,
    sent: result.finalReplySent,
  };
}
