function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeAgentMailMessagePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const base = asObject(payload.data) || payload;
  const nestedMessage = asObject(base.message) || asObject(payload.message);

  if (!nestedMessage) {
    return base;
  }

  return {
    ...base,
    ...nestedMessage,
  };
}

export function extractAgentMailProviderMessageId(
  payload: Record<string, unknown>
): string | null {
  const normalized = normalizeAgentMailMessagePayload(payload);
  return (
    toTrimmedString(normalized.id) ??
    toTrimmedString(normalized.message_id) ??
    toTrimmedString(normalized.messageId)
  );
}
