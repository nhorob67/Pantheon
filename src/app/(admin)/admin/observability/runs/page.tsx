import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin-session";
import { listRuns } from "@/lib/queries/admin-observability";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";

export default async function AdminRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tenant?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const limit = 25;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  const { runs, total } = await listRuns(admin, {
    status: sp.status,
    tenantId: sp.tenant,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Runtime Runs
        </h2>
        <Link
          href="/admin/observability"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          &larr; Back to Observability
        </Link>
      </div>

      {/* Filter controls */}
      <div className="flex gap-2">
        {["queued", "running", "completed", "failed"].map((status) => (
          <Link
            key={status}
            href={`/admin/observability/runs?status=${status}`}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              sp.status === status
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-foreground/60 hover:text-foreground"
            }`}
          >
            {status}
          </Link>
        ))}
        {sp.status && (
          <Link
            href="/admin/observability/runs"
            className="px-3 py-1 rounded-full text-xs font-medium border border-border text-foreground/40 hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </div>

      {/* Runs table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-foreground/40">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/observability/runs/${run.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {run.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground/60">
                  {run.run_kind}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      run.status === "completed"
                        ? "bg-green-500/10 text-green-500"
                        : run.status === "failed"
                          ? "bg-red-500/10 text-red-500"
                          : run.status === "running"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-foreground/10 text-foreground/60"
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground/60 text-xs">
                  {formatDateTime(run.created_at)}
                </td>
                <td className="px-4 py-3 text-foreground/40 text-xs truncate max-w-[200px]">
                  {run.error_message || "—"}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-foreground/40">
                  No runs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/60">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/observability/runs?page=${page - 1}${sp.status ? `&status=${sp.status}` : ""}`}
                className="px-3 py-1 rounded border border-border text-foreground/60 hover:text-foreground"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/observability/runs?page=${page + 1}${sp.status ? `&status=${sp.status}` : ""}`}
                className="px-3 py-1 rounded border border-border text-foreground/60 hover:text-foreground"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
