import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";

const MAX_LIFECYCLE_CONTENT_LENGTH = 320;

function clampContent(content: string, maxLength = MAX_LIFECYCLE_CONTENT_LENGTH): string {
  if (content.length <= maxLength) {
    return content;
  }

  const keep = Math.max(1, maxLength - 3);
  return `${content.slice(0, keep).trimEnd()}...`;
}

export function pickTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

export interface DiscordLifecycleReplyContext {
  channelId: string;
  replyToMessageId: string | null;
}

export function resolveDiscordLifecycleReplyContext(
  run: Pick<TenantRuntimeRun, "payload" | "metadata">
): DiscordLifecycleReplyContext | null {
  const channelId =
    pickTrimmedString(run.payload?.channel_id) ??
    pickTrimmedString(run.metadata?.lifecycle_channel_id);
  if (!channelId) {
    return null;
  }

  const replyToMessageId =
    pickTrimmedString(run.payload?.message_id) ??
    pickTrimmedString(run.metadata?.lifecycle_reply_to_message_id);

  return {
    channelId,
    replyToMessageId,
  };
}

export function buildAsyncDelegationQueuedContent(targetAgentName: string | null): string {
  const label = pickTrimmedString(targetAgentName) ?? "a teammate";
  return `Quick update - I'm looping in ${label} on that piece. I'll keep you posted here.`;
}

export function buildAsyncDelegationTerminalContent(
  run: Pick<TenantRuntimeRun, "run_kind" | "status" | "payload" | "result" | "error_message">
): string | null {
  if (run.run_kind !== "delegation_runtime") {
    return null;
  }

  const agentName =
    pickTrimmedString(run.result?.target_agent_name) ??
    pickTrimmedString(run.payload?.target_agent_name) ??
    "A teammate";

  if (run.status === "completed") {
    const summary =
      pickTrimmedString(run.result?.response_preview) ??
      pickTrimmedString(run.result?.response_text);
    if (!summary) {
      return `Quick update - ${agentName} finished their part.`;
    }

    return clampContent(`Quick update - ${agentName} finished their part. ${summary}`);
  }

  if (run.status === "awaiting_approval") {
    return clampContent(
      `Quick update - ${agentName} is waiting on approval before they can continue.`
    );
  }

  if (run.status === "failed") {
    const detail =
      pickTrimmedString(run.error_message) ??
      pickTrimmedString(run.result?.reason) ??
      "They couldn't finish it.";
    return clampContent(`Quick update - ${agentName} hit a snag. ${detail}`);
  }

  return null;
}
