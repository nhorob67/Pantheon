import { Suspense } from "react";
import type { Metadata } from "next";
import {
  requireDashboardCustomer,
  getCustomerTenant,
} from "@/lib/auth/dashboard-session";
import { KnowledgeData } from "./_components/knowledge-data";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgeSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">
            Knowledge Base
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Tenant workspace setup is required before managing knowledge files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Knowledge Base</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Upload documents for your agents to reference during conversations.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-xl bg-foreground/5 animate-pulse" />}>
        <KnowledgeData customerId={customerId} tenantId={tenant.id} />
      </Suspense>
    </div>
  );
}
