import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";
import { getDiscordTokenFromChannelConfig } from "../channel-token.ts";
import { sendDiscordChannelMessage } from "./tenant-runtime-discord.ts";
import { resolveCanonicalLegacyInstanceForTenant } from "./tenant-agents.ts";
import { patchTenantRuntimeRunMetadata } from "./tenant-runtime-queue.ts";
import {
  buildAsyncDelegationQueuedContent,
  buildAsyncDelegationTerminalContent,
  pickTrimmedString,
  resolveDiscordLifecycleReplyContext,
} from "./tenant-runtime-discord-lifecycle-utils.ts";

const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";

interface DiscordLifecycleEventRecord {
  sent_at?: string;
  message_id?: string | null;
  status?: number;
  content_preview?: string;
}

function asLifecycleEventMap(
  value: unknown
): Record<string, DiscordLifecycleEventRecord> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, DiscordLifecycleEventRecord>;
}

export interface DiscordLifecycleReplyContext {
  channelId: string;
  replyToMessageId: string | null;
}

export async function resolveDiscordBotToken(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const envToken = process.env[DISCORD_BOT_TOKEN_ENV];
  if (envToken && envToken.trim().length > 0) {
    return envToken;
  }

  const mapping = await resolveCanonicalLegacyInstanceForTenant(admin, tenantId).catch(
    () => ({ instanceId: null, ambiguous: false })
  );

  if (!mapping.instanceId) {
    return null;
  }

  const { data: instance } = await admin
    .from("instances")
    .select("channel_config")
    .eq("id", mapping.instanceId)
    .maybeSingle();

  if (!instance) {
    return null;
  }

  try {
    return getDiscordTokenFromChannelConfig(instance.channel_config);
  } catch {
    return null;
  }
}

export async function sendDiscordRunLifecycleReply(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  input: {
    content: string;
    eventKey?: string;
  }
): Promise<TenantRuntimeRun> {
  const content = pickTrimmedString(input.content);
  if (!content) {
    return run;
  }

  const replyContext = resolveDiscordLifecycleReplyContext(run);
  if (!replyContext) {
    return run;
  }

  const existingEvents = asLifecycleEventMap(run.metadata?.discord_lifecycle_events);
  if (input.eventKey && typeof existingEvents[input.eventKey]?.sent_at === "string") {
    return run;
  }

  const botToken = await resolveDiscordBotToken(admin, run.tenant_id);
  if (!botToken) {
    return run;
  }

  const sent = await sendDiscordChannelMessage({
    botToken,
    channelId: replyContext.channelId,
    content,
    replyToMessageId: replyContext.replyToMessageId,
  });

  if (!input.eventKey) {
    return run;
  }

  return patchTenantRuntimeRunMetadata(admin, run, {
    discord_lifecycle_events: {
      ...existingEvents,
      [input.eventKey]: {
        sent_at: new Date().toISOString(),
        message_id: sent.messageId,
        status: sent.status,
        content_preview: content.slice(0, 160),
      },
    },
  });
}

export async function sendAsyncDelegationLifecycleUpdate(
  admin: SupabaseClient,
  run: TenantRuntimeRun
): Promise<TenantRuntimeRun> {
  if (run.run_kind !== "delegation_runtime" || run.delegation_kind !== "async") {
    return run;
  }

  if (
    run.status !== "completed" &&
    run.status !== "failed" &&
    run.status !== "awaiting_approval"
  ) {
    return run;
  }

  const content = buildAsyncDelegationTerminalContent(run);
  if (!content) {
    return run;
  }

  return sendDiscordRunLifecycleReply(admin, run, {
    content,
    eventKey: `async_delegation:${run.status}`,
  });
}

export {
  buildAsyncDelegationQueuedContent,
  buildAsyncDelegationTerminalContent,
  pickTrimmedString,
  resolveDiscordLifecycleReplyContext,
};
