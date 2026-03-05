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
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">
            Knowledge Base
          </h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before managing knowledge files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="h-96 rounded-xl bg-foreground/5 animate-pulse" />}>
      <KnowledgeData customerId={customerId} tenantId={tenant.id} />
    </Suspense>
  );
}
