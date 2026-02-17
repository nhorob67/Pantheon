"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import type { InstanceRow } from "@/lib/queries/admin-lists";

const statusColors: Record<string, string> = {
  running: "bg-primary/10 text-primary",
  stopped: "bg-energy/10 text-amber-700",
  error: "bg-destructive/10 text-destructive",
  provisioning: "bg-intelligence/10 text-intelligence",
};

interface InstanceTableProps {
  instances: InstanceRow[];
  total: number;
  page: number;
  perPage: number;
  status: string;
  version: string;
}

export function InstanceTable({
  instances,
  total,
  page,
  perPage,
  status,
  version,
}: InstanceTableProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [versionInput, setVersionInput] = useState(version);

  useEffect(() => {
    setVersionInput(version);
  }, [version]);

  function updateParams(
    updates: Partial<{ page: string; status: string; version: string }>
  ) {
    const next = {
      page: String(page),
      status,
      version,
      ...updates,
    };
    const params = new URLSearchParams();

    if (next.page && next.page !== "1") params.set("page", next.page);
    if (next.status) params.set("status", next.status);
    if (next.version) params.set("version", next.version);

    const query = params.toString();
    router.push(query ? `/admin/instances?${query}` : "/admin/instances");
  }

  async function restartInstance(id: string) {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/instances/${id}/restart`, { method: "POST" });
      router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value, page: "1" })}
          className="border border-border rounded-lg bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="error">Error</option>
          <option value="provisioning">Provisioning</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Filter by version..."
            value={versionInput}
            onChange={(e) => setVersionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                updateParams({
                  version: versionInput.trim(),
                  page: "1",
                });
            }}
            className="pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Customer
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Version
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Last Health Check
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {instances.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-foreground/40"
                >
                  No instances found
                </td>
              </tr>
            ) : (
              instances.map((inst) => (
                <tr
                  key={inst.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-foreground/80">
                    {inst.customers?.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-mono uppercase px-2 py-0.5 rounded-full ${
                        statusColors[inst.status] ||
                        "bg-muted text-foreground/60"
                      }`}
                    >
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground/60">
                    {inst.openclaw_version || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/60">
                    {inst.last_health_check
                      ? new Date(inst.last_health_check).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => restartInstance(inst.id)}
                      disabled={actionLoading === inst.id}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      <RotateCw
                        className={`w-3 h-3 ${
                          actionLoading === inst.id ? "animate-spin" : ""
                        }`}
                      />
                      Restart
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-foreground/50">
            {total} instance{total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground/60">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
