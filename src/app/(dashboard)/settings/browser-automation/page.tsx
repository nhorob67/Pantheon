import { Suspense } from "react";
import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrowserPolicyForm } from "@/components/settings/browser-policy-form";
import { Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Browser Automation" };

export default async function BrowserAutomationPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<BrowserSkeleton />}>
      <BrowserContent customerId={customerId} />
    </Suspense>
  );
}

async function BrowserContent({ customerId }: { customerId: string }) {
  const admin = createAdminClient();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-foreground/50 text-sm">
            Create a team first to configure browser automation.
          </p>
        </div>
      </div>
    );
  }

  const { data: policy } = await admin
    .from("tenant_browser_policies")
    .select("*")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  // Count today's sessions
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: todaySessions } = await admin
    .from("tenant_browser_sessions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .gte("created_at", todayStart.toISOString());

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-headline text-xl font-semibold text-foreground flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-primary" />
          Browser Automation
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Configure browser automation policies for your agents. Browser tools
          enable portal lookups, form submissions, and data extraction from web
          pages that don&apos;t have APIs.
        </p>
      </div>

      {/* Usage summary */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-foreground/40 text-xs">Sessions Today</p>
            <p className="text-foreground font-semibold text-lg">
              {todaySessions ?? 0} / {policy?.max_sessions_per_day ?? 10}
            </p>
          </div>
          <div>
            <p className="text-foreground/40 text-xs">Max Actions / Session</p>
            <p className="text-foreground font-semibold text-lg">
              {policy?.max_actions_per_session ?? 25}
            </p>
          </div>
          <div>
            <p className="text-foreground/40 text-xs">Max Duration</p>
            <p className="text-foreground font-semibold text-lg">
              {Math.round((policy?.max_session_duration_ms ?? 120000) / 1000)}s
            </p>
          </div>
        </div>
      </div>

      <BrowserPolicyForm
        tenantId={tenant.id}
        initialPolicy={{
          domain_allowlist: policy?.domain_allowlist ?? [],
          domain_blocklist: policy?.domain_blocklist ?? [],
          require_approval_actions: policy?.require_approval_actions ?? [],
          max_sessions_per_day: policy?.max_sessions_per_day ?? 10,
          max_actions_per_session: policy?.max_actions_per_session ?? 25,
          max_session_duration_ms: policy?.max_session_duration_ms ?? 120000,
          base_cost_cents: policy?.base_cost_cents ?? 2,
          per_action_cost_cents: policy?.per_action_cost_cents ?? 1,
        }}
      />
    </div>
  );
}

function BrowserSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
