import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireDashboardUser,
  getCustomerTenant,
  getCustomerTenants,
} from "@/lib/auth/dashboard-session";
import { HelpProvider } from "@/components/dashboard/help-provider";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";
import { buildSidebarSettingsItems } from "@/lib/navigation/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, customerId } = await requireDashboardUser();

  let farmName: string | undefined;
  let workflowBuilderEnabled = false;
  let tenantOptions: Array<{
    id: string;
    slug: string;
    name: string;
    status: string;
  }> = [];
  let activeTenantId: string | null = null;

  if (customerId) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const [workflowEnabled, { data: profile }, activeTenant, tenants] = await Promise.all([
      isWorkflowBuilderEnabledForCustomer(admin, customerId),
      supabase
        .from("farm_profiles")
        .select("farm_name")
        .eq("customer_id", customerId)
        .single(),
      getCustomerTenant(customerId),
      getCustomerTenants(customerId),
    ]);

    workflowBuilderEnabled = workflowEnabled;
    farmName = profile?.farm_name || undefined;
    activeTenantId = activeTenant?.id || null;
    tenantOptions = tenants;
  }

  return (
    <HelpProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar settingsItems={buildSidebarSettingsItems(workflowBuilderEnabled)} />
        <div className="flex-1 flex flex-col">
          <Topbar
            farmName={farmName}
            email={user.email}
            tenantOptions={tenantOptions}
            activeTenantId={activeTenantId}
          />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </HelpProvider>
  );
}
