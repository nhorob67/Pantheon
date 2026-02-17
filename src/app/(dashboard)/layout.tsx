import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardUser, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { HelpProvider } from "@/components/dashboard/help-provider";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, customerId } = await requireDashboardUser();

  let farmName: string | undefined;
  let instanceStatus: string | undefined;
  let workflowBuilderEnabled = false;

  if (customerId) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const [instance, workflowEnabled, { data: profile }] = await Promise.all([
      getCustomerInstance(customerId),
      isWorkflowBuilderEnabledForCustomer(admin, customerId),
      supabase
        .from("farm_profiles")
        .select("farm_name")
        .eq("customer_id", customerId)
        .single(),
    ]);

    workflowBuilderEnabled = workflowEnabled;
    instanceStatus = instance?.status || undefined;
    farmName = profile?.farm_name || undefined;
  }

  return (
    <HelpProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar workflowBuilderEnabled={workflowBuilderEnabled} />
        <div className="flex-1 flex flex-col">
          <Topbar
            farmName={farmName}
            instanceStatus={instanceStatus}
            email={user.email}
          />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </HelpProvider>
  );
}
