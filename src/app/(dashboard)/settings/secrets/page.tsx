import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SecretsVaultPanel } from "@/components/settings/secrets-vault-panel";

export const metadata: Metadata = { title: "Secrets Vault" };

export default async function SecretsVaultPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Secrets Vault</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Complete your team setup before configuring secrets.
          </p>
        </div>
      </div>
    );
  }

  // Fetch active agents for agent scoping picker
  const admin = createAdminClient();
  const { data: agentRows } = await admin
    .from("tenant_agents")
    .select("id, display_name, agent_key")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .order("sort_order");

  const agents = (agentRows ?? []).map((a) => ({
    id: a.id as string,
    display_name: a.display_name as string,
    agent_key: a.agent_key as string,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Secrets Vault</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Store API keys and passwords for your agents to use. Secrets are encrypted at rest
          and injected server-side into HTTP requests — your agents never see the raw values.
        </p>
      </div>

      <SecretsVaultPanel tenantId={tenant.id} agents={agents} />
    </div>
  );
}
