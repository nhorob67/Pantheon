import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchScheduleActivity } from "@/lib/queries/schedule-activity";
import { ScheduleManagerPanel } from "@/components/settings/schedule-manager-panel";

export default async function SchedulesPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Schedules</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Complete onboarding to manage scheduled tasks.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();

  // Fetch schedules + agents in parallel
  const [schedulesWithActivity, { data: agents }] = await Promise.all([
    fetchScheduleActivity(admin, tenant.id),
    admin
      .from("tenant_agents")
      .select("id, display_name, agent_key, config")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("sort_order"),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Schedules</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Manage and monitor your scheduled tasks, configuration, health, and recent activity
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
