import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { UpgradeOperation } from "@/types/database";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-foreground/60",
  in_progress: "bg-intelligence/10 text-intelligence",
  completed: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
  canceled: "bg-energy/10 text-amber-700",
};

export default async function UpgradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: upgrades } = await admin
    .from("upgrade_operations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Upgrades
        </h2>
        <Link
          href="/admin/upgrades/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          New Upgrade
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Version
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Progress
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Initiated By
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {!upgrades || upgrades.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-foreground/40"
                >
                  No upgrades yet
                </td>
              </tr>
            ) : (
              (upgrades as UpgradeOperation[]).map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/upgrades/${u.id}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {u.target_version}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-mono uppercase px-2 py-0.5 rounded-full ${
                        statusColors[u.status] || "bg-muted text-foreground/60"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground/60">
                    {u.completed_instances + u.failed_instances} /{" "}
                    {u.total_instances}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/60">
                    {u.initiated_by}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/60">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
