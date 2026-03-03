import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ComposioIntegrationPanel } from "@/components/settings/composio/composio-integration-panel";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">
            Integrations
          </h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before configuring integrations.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: composioRow } = await admin
    .from("composio_configs")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  const composioConfig: ComposioConfig | null = composioRow
    ? {
        ...composioRow,
        connected_apps: (composioRow.connected_apps || []) as ComposioConnectedApp[],
      }
    : null;

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-headline text-lg font-semibold mb-1">
          Integrations
        </h3>
        <p className="text-foreground/60 text-sm">
          Connect your assistant to third-party services like Google Sheets,
          Gmail, and Calendar.
        </p>
      </div>
      <ComposioIntegrationPanel
        tenantId={tenant.id}
        initialConfig={composioConfig}
      />
    </div>
  );
}
