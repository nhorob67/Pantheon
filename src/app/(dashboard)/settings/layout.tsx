import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { customerId } = await requireDashboardUser();
  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    customerId
  );

  return (
    <div className="max-w-4xl">
      <h2 className="font-headline text-2xl font-semibold text-foreground mb-6">
        Settings
      </h2>

      <SettingsTabs workflowBuilderEnabled={workflowBuilderEnabled} />

      {children}
    </div>
  );
}
