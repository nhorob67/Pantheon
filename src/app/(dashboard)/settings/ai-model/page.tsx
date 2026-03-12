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
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">AI Model</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Tenant workspace setup is required before configuring AI models.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">AI Model</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Choose which models power your agents. The primary model handles
          conversations and complex tasks. The fast model handles background tasks
          like summarization and search.
        </p>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <ModelSelector tenantId={tenant.id} />
      </div>
      <ModelCostTips tenantId={tenant.id} />
    </div>
  );
}
