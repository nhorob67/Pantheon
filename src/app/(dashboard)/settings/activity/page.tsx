import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchScheduleActivity } from "@/lib/queries/schedule-activity";
import { ScheduleActivityPanel } from "@/components/settings/schedule-activity-panel";

export default async function ScheduleActivityPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Activity</h3>
        <p className="text-foreground/60 text-sm">
          Tenant workspace setup is required before viewing scheduled activity.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const schedules = await fetchScheduleActivity(admin, tenant.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">
          Scheduled Activity
        </h3>
        <p className="text-foreground/60 text-sm">
          Monitor your scheduled tasks &mdash; see when they last ran, upcoming
          runs, and 14-day health at a glance.
        </p>
      </div>

      <ScheduleActivityPanel tenantId={tenant.id} schedules={schedules} />
    </div>
  );
}
