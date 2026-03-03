import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin-session";
import { notFound } from "next/navigation";
import { getRunDetails } from "@/lib/queries/admin-observability";
import { RunInspector } from "@/components/admin/run-inspector";
import Link from "next/link";

export default async function AdminRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  await requireAdmin();
  const admin = createAdminClient();
  const run = await getRunDetails(admin, runId);

  if (!run) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/observability/runs"
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          &larr; Back to Runs
        </Link>
      </div>

      <div>
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Run Detail
        </h2>
        <p className="text-foreground/60 text-sm font-mono">{runId}</p>
      </div>

      <RunInspector run={run} />
    </div>
  );
}
