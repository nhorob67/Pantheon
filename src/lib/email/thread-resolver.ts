import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "@/lib/ai/session-resolver";
import type { TenantSession } from "@/types/tenant-runtime";
import {
  extractThreadingHeaders,
  resolveThreadId,
} from "./threading";

export { extractThreadingHeaders, resolveThreadId };

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
