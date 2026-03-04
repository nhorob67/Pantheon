import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "@/lib/ai/session-resolver";
import type { TenantSession } from "@/types/tenant-runtime";

export interface EmailThreadingHeaders {
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
}

/**
 * Extract RFC 822 threading headers from email_inbound metadata.
 * Handles various provider payload shapes.
 */
export function extractThreadingHeaders(
  metadata: Record<string, unknown> | null
): EmailThreadingHeaders {
  if (!metadata) {
    return { messageId: null, inReplyTo: null, references: null };
  }

  const headers =
    (metadata.headers as Record<string, unknown> | undefined) || metadata;

  function findHeader(keys: string[]): string | null {
    for (const key of keys) {
      const value = headers[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  return {
    messageId: findHeader(["message-id", "Message-Id", "Message-ID", "messageId"]),
    inReplyTo: findHeader(["in-reply-to", "In-Reply-To", "inReplyTo"]),
    references: findHeader(["references", "References"]),
  };
}

/**
 * Resolve a thread ID from RFC 822 headers.
 * Uses the first entry in the References chain (the original Message-Id),
 * or falls back to the current Message-Id for new threads.
 */
export function resolveThreadId(headers: EmailThreadingHeaders): string | null {
  // References header contains the full chain, first entry is the root
  if (headers.references) {
    const refs = headers.references
      .split(/\s+/)
      .filter((r) => r.startsWith("<") && r.endsWith(">"));
    if (refs.length > 0) {
      return refs[0];
    }
  }

  // For replies without References, use In-Reply-To as thread root
  if (headers.inReplyTo) {
    return headers.inReplyTo;
  }

  // New thread: use this message's ID as the thread root
  return headers.messageId || null;
}

/**
 * Resolve or create a tenant session for an email thread.
 * Uses the thread_id as the session's external_id.
 */
export async function resolveEmailSession(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    customerId: string;
    agentId: string | null;
    threadId: string;
    subject: string | null;
    fromEmail: string;
  }
): Promise<TenantSession> {
  const session = await resolveSession(admin, {
    tenantId: input.tenantId,
    customerId: input.customerId,
    channelId: input.threadId,
    agentId: input.agentId,
    sessionKind: "email",
  });

  // Set title on new sessions
  if (!session.title && input.subject) {
    await admin
      .from("tenant_sessions")
      .update({
        title: input.subject,
        metadata: {
          ...((session.metadata || {}) as Record<string, unknown>),
          from_email: input.fromEmail,
          channel: "email",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
  }

  return session;
}
