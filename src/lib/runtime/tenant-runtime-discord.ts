const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_CANARY_MAX_CONTENT_LENGTH = 1900;
const DISCORD_RUNTIME_MAX_CONTENT_LENGTH = 1900;
const DISCORD_RUNTIME_MAX_MESSAGE_PARTS = 4;
export const DISCORD_CANARY_PREFIX = "[Pantheon Canary]";

export interface DiscordSendMessageInput {
  botToken: string;
  channelId: string;
  content: string;
  replyToMessageId?: string | null;
}

export interface DiscordSendMessageResult {
  messageId: string | null;
  status: number;
}

export interface DiscordSendMessageSequenceInput {
  botToken: string;
  channelId: string;
  contents: string[];
  replyToMessageId?: string | null;
}

export interface DiscordSendMessageSequenceResult {
  messageIds: string[];
  status: number;
  partsSent: number;
}

export class DiscordApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(message: string, status: number, retryAfterSeconds: number | null) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function clampContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  const keep = Math.max(1, maxLength - 3);
  return `${content.slice(0, keep)}...`;
}

export function isDiscordCanaryLoopContent(content: string): boolean {
  return content.trim().startsWith(DISCORD_CANARY_PREFIX);
}

export function buildDiscordCanaryResponseContent(content: string): string {
  const normalized = content.trim();
  const body = `${DISCORD_CANARY_PREFIX} Echo: ${normalized}`;
  return clampContent(body, DISCORD_CANARY_MAX_CONTENT_LENGTH);
}

function buildRuntimePartPrefix(index: number, total: number): string {
  return `[${index}/${total}] `;
}

function resolveRuntimeMessagePartsTotal(contentLength: number): number {
  if (contentLength <= DISCORD_RUNTIME_MAX_CONTENT_LENGTH) {
    return 1;
  }

  for (let total = 2; total <= DISCORD_RUNTIME_MAX_MESSAGE_PARTS; total += 1) {
    const prefixLength = buildRuntimePartPrefix(total, total).length;
    const bodyLimit = DISCORD_RUNTIME_MAX_CONTENT_LENGTH - prefixLength;
    if (bodyLimit <= 0) {
      continue;
    }
    if (Math.ceil(contentLength / bodyLimit) <= total) {
      return total;
    }
  }

  return DISCORD_RUNTIME_MAX_MESSAGE_PARTS;
}

function splitRuntimePartsWithLimit(content: string, total: number): string[] {
  if (total <= 1) {
    return [content];
  }

  const prefixLength = buildRuntimePartPrefix(total, total).length;
  const bodyLimit = Math.max(1, DISCORD_RUNTIME_MAX_CONTENT_LENGTH - prefixLength);
  const parts: string[] = [];
  let cursor = 0;

  for (let index = 1; index <= total; index += 1) {
    const remaining = content.length - cursor;
    if (remaining <= 0) {
      break;
    }

    const isLastPart = index === total;
    const take = Math.min(bodyLimit, remaining);
    let body = content.slice(cursor, cursor + take);
    cursor += take;

    if (isLastPart && remaining > bodyLimit) {
      const trimmed = Math.max(1, bodyLimit - 3);
      body = `${content.slice(cursor - take, cursor - take + trimmed)}...`;
      cursor = content.length;
    }

    parts.push(`${buildRuntimePartPrefix(index, total)}${body}`);
  }

  return parts;
}

export function buildDiscordRuntimeResponseParts(content: string): string[] {
  const normalized = content.trim();
  if (!normalized) {
    return ["[Pantheon] Received empty runtime content."];
  }

  const total = resolveRuntimeMessagePartsTotal(normalized.length);
  return splitRuntimePartsWithLimit(normalized, total);
}

function parseRetryAfterSeconds(
  headers: Headers,
  payload: Record<string, unknown> | null
): number | null {
  const retryAfterHeader = headers.get("retry-after");
  if (retryAfterHeader) {
    const parsed = Number(retryAfterHeader);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
  }

  const resetAfterHeader = headers.get("x-ratelimit-reset-after");
  if (resetAfterHeader) {
    const parsed = Number(resetAfterHeader);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
  }

  const payloadRetryAfter = payload?.retry_after;
  if (typeof payloadRetryAfter === "number" && Number.isFinite(payloadRetryAfter)) {
    return payloadRetryAfter > 0 ? Math.ceil(payloadRetryAfter) : 0;
  }

  return null;
}

export async function sendDiscordTypingIndicator(
  botToken: string,
  channelId: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  await fetchImpl(
    `${DISCORD_API_BASE_URL}/channels/${encodeURIComponent(channelId)}/typing`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    }
  ).catch(() => {
    // Non-critical, ignore failures
  });
}

export async function sendDiscordChannelMessage(
  input: DiscordSendMessageInput,
  fetchImpl: typeof fetch = fetch
): Promise<DiscordSendMessageResult> {
  const response = await fetchImpl(
    `${DISCORD_API_BASE_URL}/channels/${encodeURIComponent(input.channelId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${input.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: input.content,
        allowed_mentions: { parse: [] as string[] },
        ...(input.replyToMessageId
          ? {
              message_reference: {
                message_id: input.replyToMessageId,
                fail_if_not_exists: false,
              },
            }
          : {}),
      }),
    }
  );

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Discord API returned status ${response.status}`;
    throw new DiscordApiError(
      message,
      response.status,
      parseRetryAfterSeconds(response.headers, payload)
    );
  }

  return {
    messageId: payload && typeof payload.id === "string" ? payload.id : null,
    status: response.status,
  };
}

export async function sendDiscordChannelMessageSequence(
  input: DiscordSendMessageSequenceInput,
  fetchImpl: typeof fetch = fetch
): Promise<DiscordSendMessageSequenceResult> {
  if (!Array.isArray(input.contents) || input.contents.length === 0) {
    throw new Error("Discord message sequence must include at least one content part");
  }

  const messageIds: string[] = [];
  let status = 200;

  for (let index = 0; index < input.contents.length; index += 1) {
    const content = input.contents[index];
    const sent = await sendDiscordChannelMessage(
      {
        botToken: input.botToken,
        channelId: input.channelId,
        content,
        replyToMessageId: index === 0 ? input.replyToMessageId : null,
      },
      fetchImpl
    );
    status = sent.status;
    if (sent.messageId) {
      messageIds.push(sent.messageId);
    }
  }

  return {
    messageIds,
    status,
    partsSent: input.contents.length,
  };
}
