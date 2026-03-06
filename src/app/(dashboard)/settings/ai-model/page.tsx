import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { ModelSelector } from "@/components/settings/model-selector";
import { ModelCostTips } from "@/components/settings/model-cost-tips";

export const metadata: Metadata = { title: "AI Model" };

export default async function AiModelSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">AI Model</h3>
        <p className="text-foreground/60 text-sm">
          Tenant workspace setup is required before configuring AI models.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-lg font-semibold mb-1">AI Model</h3>
        <p className="text-foreground/60 text-sm mb-6">
          Choose which models power your farm assistant. The primary model handles
          conversations and complex tasks. The fast model handles background tasks
          like summarization and search.
        </p>
        <ModelSelector tenantId={tenant.id} />
      </div>
      <ModelCostTips tenantId={tenant.id} />
    </div>
  );
}
