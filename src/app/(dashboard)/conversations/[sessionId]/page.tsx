import type { Metadata } from "next";
import { Suspense } from "react";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConversationReplay } from "@/components/dashboard/conversation-replay";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationReplayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/conversations"
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          &larr; Back to Conversations
        </Link>
      </div>

      <div>
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Conversation Replay
        </h2>
        <p className="text-foreground/60 text-sm">
          Session {sessionId.slice(0, 8)}...
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        }
      >
        <ConversationReplayContent sessionId={sessionId} />
      </Suspense>
    </div>
  );
}

async function ConversationReplayContent({
  sessionId,
}: {
  sessionId: string;
}) {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <EmptyState
        icon={Building2}
        title="No workspace configured"
        description="Complete onboarding to set up your agent workspace."
        actions={[{ label: "Start Onboarding", variant: "primary", href: "/onboarding" }]}
      />
    );
  }

  const admin = createAdminClient();

  const [messagesResult, tracesResult] = await Promise.all([
    admin
      .from("tenant_messages")
      .select("id, direction, author_type, content, token_count, created_at")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .limit(200),
    admin
      .from("tenant_conversation_traces")
      .select("*")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ConversationReplay
      messages={messagesResult.data || []}
      traces={tracesResult.data || []}
    />
  );
}
