import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScheduleManagerPanel } from "@/components/settings/schedule-manager-panel";

export default async function SchedulesPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Schedules</h3>
        <p className="text-foreground/60 text-sm">
          Complete onboarding to manage scheduled tasks.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();

  // Fetch schedules with agent names
  const { data: schedules } = await admin
    .from("tenant_scheduled_messages")
    .select(
      "id, schedule_key, cron_expression, timezone, enabled, last_run_at, next_run_at, agent_id, channel_id, metadata, schedule_type, display_name, prompt, tools, created_by, created_at, updated_at, tenant_agents(id, display_name)"
    )
    .eq("tenant_id", tenant.id)
    .order("enabled", { ascending: false })
    .order("created_at", { ascending: false });

  // Fetch agents for the create form
  const { data: agents } = await admin
    .from("tenant_agents")
    .select("id, display_name, agent_key, config")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">
          Schedules
        </h3>
        <p className="text-foreground/60 text-sm">
          Manage predefined and custom recurring tasks. Create scheduled reminders,
          reports, and checks that your agents run automatically.
        </p>
      </div>

      <ScheduleManagerPanel
        tenantId={tenant.id}
        schedules={schedules || []}
        agents={(agents || []).map((a) => ({
          id: a.id,
          display_name: a.display_name,
          discord_channel_id:
            typeof (a.config as Record<string, unknown>)?.discord_channel_id === "string"
              ? ((a.config as Record<string, unknown>).discord_channel_id as string)
              : null,
        }))}
      />
    </div>
  );
}
