import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { HeartbeatSettingsPanel } from "@/components/settings/heartbeat-settings-panel";
import { fetchHeartbeatActivity } from "@/lib/queries/heartbeat-activity";

export const metadata: Metadata = { title: "Heartbeat" };

export default async function HeartbeatPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Heartbeat</h3>
        <p className="text-foreground/60 text-sm">
          Complete onboarding to configure proactive check-ins.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();

  const [activity, agentsResult] = await Promise.all([
    fetchHeartbeatActivity(admin, tenant.id),
    admin
      .from("tenant_agents")
      .select("id, display_name, agent_key, config")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("sort_order"),
  ]);

  const agents = (agentsResult.data || []).map((a) => ({
    id: a.id,
    display_name: a.display_name,
    discord_channel_id:
      typeof (a.config as Record<string, unknown>)?.discord_channel_id === "string"
        ? ((a.config as Record<string, unknown>).discord_channel_id as string)
        : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Heartbeat</h3>
        <p className="text-foreground/60 text-sm">
          Your assistant periodically checks weather, markets, tickets, and email
          — and only messages you when something needs attention.
        </p>
      </div>

      <HeartbeatSettingsPanel
        tenantId={tenant.id}
        initialActivity={activity}
        agents={agents}
      />
    </div>
  );
}
