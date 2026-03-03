import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin-session";
import Link from "next/link";
import { getObservabilitySnapshot } from "@/lib/queries/admin-observability";
import { ObservabilityDashboard } from "@/components/admin/observability-dashboard";

export default async function AdminObservabilityPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const snapshot = await getObservabilitySnapshot(admin);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Observability
        </h2>
        <Link
          href="/admin/observability/runs"
          className="text-sm text-primary hover:underline"
        >
          View all runs &rarr;
        </Link>
      </div>

      <ObservabilityDashboard snapshot={snapshot} />
    </div>
  );
}
