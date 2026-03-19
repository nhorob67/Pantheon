import { Suspense } from "react";
import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { IntegrationListPanel } from "@/components/settings/integrations/integration-list-panel";
import { listIntegrations } from "@/lib/runtime/tenant-integrations";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<IntegrationsSkeleton />}>
      <IntegrationsContent customerId={customerId} />
    </Suspense>
  );
}

async function IntegrationsContent({ customerId }: { customerId: string }) {
  const admin = createAdminClient();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Complete onboarding to manage integrations.
          </p>
        </div>
      </div>
    );
  }

  const integrations = await listIntegrations(admin, tenant.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-foreground/60 mt-1">
          External service connections set up by your agents
        </p>
      </div>

      <IntegrationListPanel
        tenantId={tenant.id}
        initialIntegrations={integrations}
      />
    </div>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
