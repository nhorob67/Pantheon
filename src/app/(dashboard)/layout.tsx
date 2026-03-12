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
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
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

  let teamName: string | undefined;
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

    const [workflowEnabled, { data: teamProfile }, activeTenant, tenants, { data: customerRow }] = await Promise.all([
      isWorkflowBuilderEnabledForCustomer(admin, customerId),
      supabase
        .from("team_profiles")
        .select("team_name")
        .eq("customer_id", customerId)
        .maybeSingle(),
      getCustomerTenant(customerId),
      getCustomerTenants(customerId),
      supabase
        .from("customers")
        .select("subscription_status, trial_ends_at")
        .eq("id", customerId)
        .single(),
    ]);

    workflowBuilderEnabled = workflowEnabled;
    teamName = teamProfile?.team_name || undefined;
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
        <div className="flex min-h-screen bg-background text-[13px] tracking-[0.01em]">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-accent focus:outline-none">Skip to main content</a>
          <Sidebar
            settingsItems={settingsItems}
            subscriptionStatus={subscriptionStatus}
            trialEndsAt={trialEndsAt}
          />
          <div className="flex-1 flex flex-col">
            <Topbar
              teamName={teamName}
              email={user.email}
              tenantOptions={tenantOptions}
              activeTenantId={activeTenantId}
              settingsItems={settingsItems}
            />
            {isTrialing && !isExpired && (
              <TrialBanner trialEndsAt={trialEndsAt!} />
            )}
            <main id="main-content" className="flex-1 p-6 relative">
              <Breadcrumbs />
              {children}
              {isExpired && <TrialExpiredOverlay />}
            </main>
          </div>
        </div>
      </HelpProvider>
    </ToastProvider>
  );
}
