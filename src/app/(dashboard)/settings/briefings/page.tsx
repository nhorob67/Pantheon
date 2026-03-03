import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { BriefingConfigPanel } from "@/components/settings/briefing-config-panel";

export default async function BriefingSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Briefings</h3>
        <p className="text-foreground/60 text-sm">
          Tenant workspace setup is required before configuring briefings.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_scheduled_messages")
    .select("id, enabled, cron_expression, channel_id, metadata, next_run_at")
    .eq("tenant_id", tenant.id)
    .eq("schedule_key", "morning_briefing")
    .maybeSingle();

  const metadata = (data?.metadata || {}) as Record<string, unknown>;
  const initialConfig = data
    ? {
        enabled: data.enabled as boolean,
        send_time: String(metadata.send_time || "06:30"),
        timezone: String(metadata.timezone || "America/Chicago"),
        channel_id: data.channel_id || "",
        sections: (metadata.briefing_sections as {
          weather: boolean;
          grain_bids: boolean;
          ticket_summary: boolean;
        }) || { weather: true, grain_bids: true, ticket_summary: false },
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">
          Morning Briefing
        </h3>
        <p className="text-foreground/60 text-sm">
          Configure your daily briefing — choose what sections to include,
          what time to send, and which Discord channel to post in.
        </p>
      </div>

      <BriefingConfigPanel
        tenantId={tenant.id}
        initialConfig={initialConfig}
      />
    </div>
  );
}
