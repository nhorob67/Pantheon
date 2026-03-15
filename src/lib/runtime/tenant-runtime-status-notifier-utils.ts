import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";

const COMPLETION_NOTIFICATION_MAX_LENGTH = 300;

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function clamp(value: string, maxLength = COMPLETION_NOTIFICATION_MAX_LENGTH): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

function formatAckSummary(ack: string): string | null {
  switch (ack) {
    case "ai_response_dispatched":
    case "runtime_dispatched":
      return "Response sent to Discord.";
    case "email_ai_response_dispatched":
      return "Response sent.";
    case "canary_dispatched":
      return "Canary response sent.";
    default:
      return null;
  }
}

function buildCompletedSummary(run: TenantRuntimeRun): string | null {
  const changeSummary = pickString(run.result.change_summary);
  if (changeSummary) {
    return changeSummary;
  }

  const responsePreview = pickString(run.result.response_preview);
  if (responsePreview) {
    return responsePreview;
  }

  const displayName = pickString(run.result.display_name);
  if (displayName) {
    return `Updated ${displayName}.`;
  }

  const agentName = pickString(run.result.agent_name);
  if (agentName) {
    return `${agentName} finished the task.`;
  }

  const ack = pickString(run.result.ack);
  if (ack) {
    return formatAckSummary(ack) ?? null;
  }

  return null;
}

function buildFailedSummary(run: TenantRuntimeRun): string | null {
  const errorMessage = pickString(run.error_message);
  if (errorMessage) {
    return errorMessage;
  }

  const reason = pickString(run.result.reason);
  if (reason) {
    return reason;
  }

  const ack = pickString(run.result.ack);
  if (ack) {
    return ack.replace(/_/g, " ");
  }

  return null;
}

export function buildDiscordRuntimeCompletionNotificationContent(
  run: TenantRuntimeRun
): string | null {
  if (run.status === "completed") {
    const summary = buildCompletedSummary(run);
    if (!summary) {
      return "Task complete.";
    }
    return clamp(
      /^task complete\b/i.test(summary) ? summary : `Task complete. ${summary}`
    );
  }

  if (run.status === "failed") {
    const summary = buildFailedSummary(run);
    if (!summary) {
      return "Task failed. I couldn't finish this run.";
    }
    return clamp(
      /^task failed\b/i.test(summary) ? summary : `Task failed. ${summary}`
    );
  }

  return null;
}

export function shouldSendDiscordRuntimeCompletionNotification(
  run: TenantRuntimeRun
): boolean {
  if (run.run_kind !== "discord_runtime") {
    return false;
  }

  if (run.status !== "completed" && run.status !== "failed") {
    return false;
  }

  if (run.metadata.notify_on_completion !== true) {
    return false;
  }

  if (
    run.metadata.completion_notification_event === run.status
    && typeof run.metadata.completion_notification_sent_at === "string"
  ) {
    return false;
  }

  const payloadRunKind = pickString(run.payload.run_kind);
  if (payloadRunKind === "discord_cron" && run.metadata.completion_notification_source !== "run_override") {
    return false;
  }

  return true;
}
