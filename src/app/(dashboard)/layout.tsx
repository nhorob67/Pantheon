import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireDashboardUser,
  getCustomerTenant,
  getCustomerTenants,
} from "@/lib/auth/dashboard-session";
import { HelpProvider } from "@/components/dashboard/help-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { TrialExpiredOverlay } from "@/components/dashboard/trial-expired-overlay";
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
  let subscriptionStatus: string | null = null;
  let trialEndsAt: string | null = null;

  if (customerId) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const [workflowEnabled, { data: profile }, activeTenant, tenants, { data: customerRow }] = await Promise.all([
      isWorkflowBuilderEnabledForCustomer(admin, customerId),
      supabase
        .from("farm_profiles")
        .select("farm_name")
        .eq("customer_id", customerId)
        .single(),
      getCustomerTenant(customerId),
      getCustomerTenants(customerId),
      supabase
        .from("customers")
        .select("subscription_status, trial_ends_at")
        .eq("id", customerId)
        .single(),
    ]);

    workflowBuilderEnabled = workflowEnabled;
    farmName = profile?.farm_name || undefined;
    activeTenantId = activeTenant?.id || null;
    tenantOptions = tenants;
    subscriptionStatus = customerRow?.subscription_status || null;
    trialEndsAt = customerRow?.trial_ends_at || null;
  }

  const isTrialing = subscriptionStatus === "trialing" && trialEndsAt;
  const isExpired =
    subscriptionStatus === "expired" ||
    (subscriptionStatus === "trialing" &&
      trialEndsAt &&
      new Date(trialEndsAt) < new Date());

  const settingsItems = buildSidebarSettingsItems(workflowBuilderEnabled);

  return (
    <ToastProvider>
      <HelpProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar
            settingsItems={settingsItems}
            subscriptionStatus={subscriptionStatus}
            trialEndsAt={trialEndsAt}
          />
          <div className="flex-1 flex flex-col">
            <Topbar
              farmName={farmName}
              email={user.email}
              tenantOptions={tenantOptions}
              activeTenantId={activeTenantId}
              settingsItems={settingsItems}
            />
            {isTrialing && !isExpired && (
              <TrialBanner trialEndsAt={trialEndsAt!} />
            )}
            <main className="flex-1 p-6 relative">
              {children}
              {isExpired && <TrialExpiredOverlay />}
            </main>
          </div>
        </div>
      </HelpProvider>
    </ToastProvider>
  );
}
