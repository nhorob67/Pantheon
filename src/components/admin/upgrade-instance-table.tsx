"use client";

import { useState, useEffect } from "react";

interface UpgradeLogRow {
  id: string;
  status: string;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  instances: {
    id: string;
    coolify_uuid: string | null;
    customers: { email: string | null } | null;
  } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-muted text-foreground/60",
  in_progress: "bg-intelligence/10 text-intelligence",
  completed: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-energy/10 text-amber-700",
};

export function UpgradeInstanceTable({ upgradeId }: { upgradeId: string }) {
  const [logs, setLogs] = useState<UpgradeLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    function fetchLogs() {
      fetch(`/api/admin/upgrades/${upgradeId}`)
        .then((res) => res.json())
        .then((data) => {
          if (canceled) return;
          setLogs(data.logs || []);
          setLoading(false);
        });
    }

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [upgradeId]);

  if (loading) {
    return <div className="text-foreground/40 text-sm">Loading...</div>;
  }

  return (
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
              Started
            </th>
            <th className="text-left px-4 py-3 font-medium text-foreground/60">
              Completed
            </th>
            <th className="text-left px-4 py-3 font-medium text-foreground/60">
              Error
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3 text-foreground/80">
                {log.instances?.customers?.email || "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs font-mono uppercase px-2 py-0.5 rounded-full ${
                    statusColors[log.status] || "bg-muted text-foreground/60"
                  }`}
                >
                  {log.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-foreground/60">
                {log.started_at
                  ? new Date(log.started_at).toLocaleTimeString()
                  : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-foreground/60">
                {log.completed_at
                  ? new Date(log.completed_at).toLocaleTimeString()
                  : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-destructive max-w-[200px] truncate">
                {log.error_message || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
