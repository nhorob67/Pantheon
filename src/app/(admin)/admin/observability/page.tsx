import { Suspense } from "react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin-session";
import Link from "next/link";
import { getObservabilitySnapshot, getDelegationAnalytics } from "@/lib/queries/admin-observability";
import { ObservabilityDashboard } from "@/components/admin/observability-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Observability" };

export default async function AdminObservabilityPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Observability
        </h2>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/observability/guardrails"
            className="text-sm text-primary hover:underline"
          >
            Guardrail events &rarr;
          </Link>
          <Link
            href="/admin/observability/runs"
            className="text-sm text-primary hover:underline"
          >
            View all runs &rarr;
          </Link>
        </div>
      </div>

      <Suspense fallback={<ObservabilitySkeleton />}>
        <ObservabilityContent />
      </Suspense>
    </div>
  );
}

async function ObservabilityContent() {
  const admin = createAdminClient();
  const [snapshot, delegationAnalytics] = await Promise.all([
    getObservabilitySnapshot(admin),
    getDelegationAnalytics(admin),
  ]);

  return (
    <ObservabilityDashboard
      snapshot={snapshot}
      delegationAnalytics={delegationAnalytics}
    />
  );
}

function ObservabilitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
