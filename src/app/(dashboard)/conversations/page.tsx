import { Suspense } from "react";
import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { ConversationData } from "./_components/conversation-data";
import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Conversations" };

export default async function ConversationsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Conversations
        </h2>
        <p className="text-foreground/60 text-sm">
          Review past conversations and see how your AI assistant responded.
        </p>
      </div>

      <Suspense fallback={<ConversationSkeleton />}>
        <ConversationData tenantId={tenant.id} />
      </Suspense>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-foreground/5 animate-pulse" />
      ))}
    </div>
  );
}
