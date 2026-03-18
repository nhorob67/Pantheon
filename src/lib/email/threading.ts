export interface EmailThreadingHeaders {
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
}

export function extractThreadingHeaders(
  metadata: Record<string, unknown> | null
): EmailThreadingHeaders {
  if (!metadata) {
    return { messageId: null, inReplyTo: null, references: null };
  }

  const headerSources: Record<string, unknown>[] = [];
  const nestedHeaders = metadata.headers;
  if (nestedHeaders && typeof nestedHeaders === "object" && !Array.isArray(nestedHeaders)) {
    headerSources.push(nestedHeaders as Record<string, unknown>);
  }
  headerSources.push(metadata);

  function findHeader(keys: string[]): string | null {
    for (const source of headerSources) {
      for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim().length > 0) {
          return value.trim();
        }
        if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim().length > 0) {
          return value[0].trim();
        }
      }
    }
    return null;
  }

  return {
    messageId: findHeader([
      "message-id",
      "Message-Id",
      "Message-ID",
      "messageId",
      "message_id",
    ]),
    inReplyTo: findHeader([
      "in-reply-to",
      "In-Reply-To",
      "inReplyTo",
      "in_reply_to",
    ]),
    references: findHeader([
      "references",
      "References",
      "references_header",
    ]),
  };
}

export function resolveThreadId(headers: EmailThreadingHeaders): string | null {
  if (headers.references) {
    const refs = headers.references
      .split(/\s+/)
      .filter((r) => r.startsWith("<") && r.endsWith(">"));
    if (refs.length > 0) {
      return refs[0];
    }
  }

  if (headers.inReplyTo) {
    return headers.inReplyTo;
  }

  return headers.messageId || null;
}
