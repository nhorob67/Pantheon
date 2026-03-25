import { runWithCircuitBreaker } from "./tenant-runtime-circuit-breaker";
import { logSilentCatch } from "@/lib/telemetry/silent-catch";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_CANARY_MAX_CONTENT_LENGTH = 1900;
const DISCORD_RUNTIME_MAX_CONTENT_LENGTH = 1900;
const DISCORD_RUNTIME_MAX_MESSAGE_PARTS = 4;
const DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD = 3;
const DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS = 30_000;
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
  totalParts: number;
  partialFailure: boolean;
}

export interface DiscordRuntimeVisibleReplyInput {
  tenantId: string;
  botToken: string;
  channelId: string;
  content: string;
  replyToMessageId?: string | null;
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

function clampWithEllipsis(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  const keep = Math.max(1, maxLength - 3);
  return `${content.slice(0, keep).trimEnd()}...`;
}

function resolveRuntimeChunkBodyLimit(): number {
  return (
    DISCORD_RUNTIME_MAX_CONTENT_LENGTH -
    buildRuntimePartPrefix(
      DISCORD_RUNTIME_MAX_MESSAGE_PARTS,
      DISCORD_RUNTIME_MAX_MESSAGE_PARTS
    ).length
  );
}

function splitOversizedSegment(segment: string, bodyLimit: number): string[] {
  const parts: string[] = [];
  let remaining = segment;

  while (remaining.length > bodyLimit) {
    let take = bodyLimit;
    const whitespaceIndex = remaining.lastIndexOf(" ", bodyLimit);
    if (whitespaceIndex > Math.floor(bodyLimit * 0.6)) {
      take = whitespaceIndex;
    }
    parts.push(remaining.slice(0, take).trimEnd());
    remaining = remaining.slice(take).trimStart();
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts;
}

function splitRuntimeBodies(content: string, bodyLimit: number): string[] {
  const lines = content.split("\n");
  const bodies: string[] = [];
  let current = "";

  const flushCurrent = (): void => {
    if (current.trim().length === 0) {
      current = "";
      return;
    }
    bodies.push(current);
    current = "";
  };

  for (const line of lines) {
    const candidate = current.length > 0 ? `${current}\n${line}` : line;
    if (candidate.length <= bodyLimit) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      flushCurrent();
    }

    if (line.length <= bodyLimit) {
      current = line;
      continue;
    }

    const segments = splitOversizedSegment(line, bodyLimit);
    if (segments.length === 0) {
      continue;
    }

    for (let index = 0; index < segments.length - 1; index += 1) {
      bodies.push(segments[index]);
    }

    current = segments[segments.length - 1];
  }

  flushCurrent();
  return bodies.length > 0 ? bodies : [clampWithEllipsis(content, bodyLimit)];
}

function resolveOpenFence(body: string): string | null {
  let openFence: string | null = null;

  for (const line of body.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith("```")) {
      continue;
    }

    if (openFence) {
      openFence = null;
      continue;
    }

    openFence = trimmed.trim();
  }

  return openFence;
}

function appendFenceCloser(body: string, bodyLimit: number): string {
  const closer = "\n```";
  if (body.length + closer.length <= bodyLimit) {
    return `${body}${closer}`;
  }

  return `${clampWithEllipsis(body, Math.max(1, bodyLimit - closer.length))}${closer}`;
}

function prependFenceOpener(body: string, opener: string, bodyLimit: number): string {
  const prefix = `${opener}\n`;
  if ((prefix + body).length <= bodyLimit) {
    return `${prefix}${body}`;
  }

  return `${prefix}${clampWithEllipsis(body, Math.max(1, bodyLimit - prefix.length))}`;
}

function rebalanceFenceAwareBodies(bodies: string[], bodyLimit: number): string[] {
  const balanced: string[] = [];
  let carryOpenFence: string | null = null;

  for (const rawBody of bodies) {
    let body = rawBody;
    if (carryOpenFence) {
      body = prependFenceOpener(body, carryOpenFence, bodyLimit);
    }

    const openFence = resolveOpenFence(body);
    if (openFence) {
      body = appendFenceCloser(body, bodyLimit);
    }

    balanced.push(body);
    carryOpenFence = openFence;
  }

  return balanced.filter((body) => body.trim().length > 0);
}

function ensureTruncatedWithEllipsis(body: string, bodyLimit: number): string {
  if (body.length >= bodyLimit - 3) {
    return `${body.slice(0, Math.max(1, bodyLimit - 3)).trimEnd()}...`;
  }

  return `${body.trimEnd()}...`;
}

export function buildDiscordRuntimeResponseParts(content: string): string[] {
  const normalized = content.trim();
  if (!normalized) {
    return ["[Pantheon] Received empty runtime content."];
  }

  if (normalized.length <= DISCORD_RUNTIME_MAX_CONTENT_LENGTH) {
    return [normalized];
  }

  const bodyLimit = resolveRuntimeChunkBodyLimit();
  let bodies = rebalanceFenceAwareBodies(
    splitRuntimeBodies(normalized, bodyLimit),
    bodyLimit
  );

  if (bodies.length > DISCORD_RUNTIME_MAX_MESSAGE_PARTS) {
    bodies = bodies.slice(0, DISCORD_RUNTIME_MAX_MESSAGE_PARTS);
    const truncatedLastBody = ensureTruncatedWithEllipsis(
      bodies[bodies.length - 1],
      bodyLimit
    );
    bodies[bodies.length - 1] = resolveOpenFence(truncatedLastBody)
      ? appendFenceCloser(truncatedLastBody, bodyLimit)
      : truncatedLastBody;
  }

  return bodies.map((body, index) => `${buildRuntimePartPrefix(index + 1, bodies.length)}${body}`);
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
    const baseMessage =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Discord API returned status ${response.status}`;
    const errorsDetail = payload?.errors;
    const detailSuffix = errorsDetail
      ? ` — details: ${JSON.stringify(errorsDetail)}`
      : "";
    const contentLength = input.content?.length ?? 0;
    const diagnosticSuffix = ` (content_length=${contentLength}, channel=${input.channelId}, has_reply_ref=${!!input.replyToMessageId})`;
    throw new DiscordApiError(
      `${baseMessage}${detailSuffix}${diagnosticSuffix}`,
      response.status,
      parseRetryAfterSeconds(response.headers, payload)
    );
  }

  return {
    messageId: payload && typeof payload.id === "string" ? payload.id : null,
    status: response.status,
  };
}

// ---------------------------------------------------------------------------
// File attachment support
// ---------------------------------------------------------------------------

export interface DiscordFileAttachment {
  name: string;
  data: Buffer | Uint8Array;
  contentType: string;
}

export interface DiscordSendMessageWithFilesInput {
  botToken: string;
  channelId: string;
  content: string;
  files: DiscordFileAttachment[];
  replyToMessageId?: string | null;
}

/**
 * Send a Discord message with file attachments using multipart/form-data.
 * Discord API v10 supports files[n] fields for file uploads.
 */
export async function sendDiscordChannelMessageWithFiles(
  input: DiscordSendMessageWithFilesInput,
  fetchImpl: typeof fetch = fetch
): Promise<DiscordSendMessageResult> {
  const formData = new FormData();

  // JSON payload as payload_json field
  const jsonPayload = {
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
    attachments: input.files.map((f, i) => ({
      id: i,
      filename: f.name,
    })),
  };
  formData.append("payload_json", JSON.stringify(jsonPayload));

  // Attach files
  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i];
    const blob = new Blob([new Uint8Array(file.data)], { type: file.contentType });
    formData.append(`files[${i}]`, blob, file.name);
  }

  const response = await fetchImpl(
    `${DISCORD_API_BASE_URL}/channels/${encodeURIComponent(input.channelId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${input.botToken}`,
        // Content-Type is set automatically by FormData
      },
      body: formData,
    }
  );

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const baseMessage =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Discord API returned status ${response.status}`;
    const errorsDetail = payload?.errors;
    const detailSuffix = errorsDetail
      ? ` — details: ${JSON.stringify(errorsDetail)}`
      : "";
    throw new DiscordApiError(
      `${baseMessage}${detailSuffix} (file_upload, channel=${input.channelId})`,
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
  let actualPartsSent = 0;

  for (let index = 0; index < input.contents.length; index += 1) {
    const content = input.contents[index];
    try {
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
      actualPartsSent += 1;
      if (sent.messageId) {
        messageIds.push(sent.messageId);
      }
    } catch (error) {
      logSilentCatch("discord-message-sequence-part", error);
      // If no parts were sent at all, re-throw so the circuit breaker sees the failure
      if (actualPartsSent === 0) throw error;
      break;
    }
  }

  return {
    messageIds,
    status,
    partsSent: actualPartsSent,
    totalParts: input.contents.length,
    partialFailure: actualPartsSent < input.contents.length,
  };
}

export async function dispatchDiscordRuntimeVisibleReply(
  input: DiscordRuntimeVisibleReplyInput,
  fetchImpl: typeof fetch = fetch
): Promise<DiscordSendMessageResult> {
  return runWithCircuitBreaker(
    `discord_dispatch:${input.tenantId}`,
    () =>
      sendDiscordChannelMessage(
        {
          botToken: input.botToken,
          channelId: input.channelId,
          content: input.content,
          replyToMessageId: input.replyToMessageId,
        },
        fetchImpl
      ),
    {
      failureThreshold: DISCORD_DISPATCH_CIRCUIT_FAILURE_THRESHOLD,
      cooldownMs: DISCORD_DISPATCH_CIRCUIT_COOLDOWN_MS,
    }
  );
}

// ---------------------------------------------------------------------------
// Opt-in final-reply dedup guard
// ---------------------------------------------------------------------------
// Scoped to final AI reply dispatch — NOT applied to intermediate sends,
// canary dispatch, or completion notifications. Fingerprint includes runId
// to avoid cross-run collisions.

export interface FinalReplyDedupKey {
  runId: string;
  channelId: string;
  replyToMessageId: string | null;
  partIndex: number;
  contentHash: string;
}

const finalReplySentKeys = new Map<string, number>();
const FINAL_REPLY_DEDUP_TTL_MS = 120_000;
const MAX_FINAL_REPLY_KEYS = 2000;

// Periodic cleanup: evict expired entries every 30s
setInterval(() => {
  const now = Date.now();
  for (const [key, addedAt] of finalReplySentKeys) {
    if (now - addedAt > FINAL_REPLY_DEDUP_TTL_MS) {
      finalReplySentKeys.delete(key);
    }
  }
}, 30_000).unref();

function buildFinalReplyFingerprint(key: FinalReplyDedupKey): string {
  return `${key.runId}:${key.channelId}:${key.replyToMessageId ?? ""}:${key.partIndex}:${key.contentHash}`;
}

function simpleContentHash(content: string): string {
  // Fast, non-crypto hash — sufficient for dedup within a 2-minute window
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/**
 * Check whether this exact final reply part was already sent.
 * Returns true if the reply should be skipped (duplicate).
 */
export function checkAndMarkFinalReply(key: Omit<FinalReplyDedupKey, "contentHash"> & { content: string }): boolean {
  const fingerprint = buildFinalReplyFingerprint({
    ...key,
    contentHash: simpleContentHash(key.content),
  });
  if (finalReplySentKeys.has(fingerprint)) {
    return true; // duplicate — skip
  }
  // Evict oldest entry if at capacity
  if (finalReplySentKeys.size >= MAX_FINAL_REPLY_KEYS) {
    const firstKey = finalReplySentKeys.keys().next().value;
    if (firstKey !== undefined) finalReplySentKeys.delete(firstKey);
  }
  finalReplySentKeys.set(fingerprint, Date.now());
  return false; // not a duplicate — proceed
}
