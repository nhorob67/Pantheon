import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchScheduleActivity } from "@/lib/queries/schedule-activity";
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

  // Fetch schedules with activity data (14-day heatmap, recent runs, health)
  const schedulesWithActivity = await fetchScheduleActivity(admin, tenant.id);

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
          Manage and monitor your scheduled tasks. See configuration, health,
          and recent activity all in one place.
        </p>
      </div>

      <ScheduleManagerPanel
        tenantId={tenant.id}
        schedules={schedulesWithActivity}
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
