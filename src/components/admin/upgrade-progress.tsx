"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UpgradeOperation } from "@/types/database";

interface UpgradeProgressProps {
  upgradeId: string;
  initialUpgrade: UpgradeOperation;
}

export function UpgradeProgress({
  upgradeId,
  initialUpgrade,
}: UpgradeProgressProps) {
  const router = useRouter();
  const [upgrade, setUpgrade] = useState(initialUpgrade);
  const [executing, setExecuting] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const isActive =
    upgrade.status === "pending" || upgrade.status === "in_progress";
  const progress =
    upgrade.total_instances > 0
      ? Math.round(
          ((upgrade.completed_instances + upgrade.failed_instances) /
            upgrade.total_instances) *
            100
        )
      : 0;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/upgrades/${upgradeId}`);
    const data = await res.json();
    if (data.upgrade) setUpgrade(data.upgrade);
  }, [upgradeId]);

  // Auto-poll while executing
  useEffect(() => {
    if (!executing) return;
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [executing, refresh]);

  async function executeBatch() {
    setExecuting(true);

    const res = await fetch(`/api/admin/upgrades/${upgradeId}/execute`, {
      method: "POST",
    });
    const data = await res.json();

    await refresh();

    if (data.remaining > 0 && data.status === "in_progress") {
      // Auto-execute next batch
      setTimeout(() => executeBatch(), 500);
    } else {
      setExecuting(false);
    }
  }

  async function cancelUpgrade() {
    setCanceling(true);
    await fetch(`/api/admin/upgrades/${upgradeId}/cancel`, {
      method: "POST",
    });
    await refresh();
    setCanceling(false);
    router.refresh();
  }

  const statusColors: Record<string, string> = {
    pending: "bg-muted text-foreground/60",
    in_progress: "bg-intelligence/10 text-intelligence",
    completed: "bg-primary/10 text-primary",
    failed: "bg-destructive/10 text-destructive",
    canceled: "bg-energy/10 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full ${
            statusColors[upgrade.status] || "bg-muted text-foreground/60"
          }`}
        >
          {upgrade.status}
        </span>
        <span className="font-mono text-sm text-foreground/60">
          {upgrade.completed_instances + upgrade.failed_instances} /{" "}
          {upgrade.total_instances}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className="h-3 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex gap-4 text-sm text-foreground/60">
        <span>
          Completed:{" "}
          <span className="font-mono text-primary">
            {upgrade.completed_instances}
          </span>
        </span>
        <span>
          Failed:{" "}
          <span className="font-mono text-destructive">
            {upgrade.failed_instances}
          </span>
        </span>
        <span>
          Remaining:{" "}
          <span className="font-mono">
            {upgrade.total_instances -
              upgrade.completed_instances -
              upgrade.failed_instances}
          </span>
        </span>
      </div>

      {isActive && (
        <div className="flex gap-3">
          <button
            onClick={executeBatch}
            disabled={executing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {executing ? "Executing..." : "Execute Upgrade"}
          </button>
          <button
            onClick={cancelUpgrade}
            disabled={canceling || executing}
            className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 disabled:opacity-50"
          >
            {canceling ? "Canceling..." : "Cancel"}
          </button>
        </div>
      )}
    </div>
  );
}
