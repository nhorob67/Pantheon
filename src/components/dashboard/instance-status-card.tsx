"use client";

import { useTenantContextStatus } from "@/hooks/use-tenant-context-status";
import {
  Activity,
  RefreshCw,
  Square,
} from "lucide-react";

interface InstanceStatusCardProps {
  tenantId: string;
}

export function InstanceStatusCard({ tenantId }: InstanceStatusCardProps) {
  const { status, loading } = useTenantContextStatus(tenantId);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-4" />
        <div className="h-8 bg-muted rounded w-32" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <p className="text-foreground/60 text-sm">No instance found</p>
      </div>
    );
  }

  const statusConfig = {
    active: {
      color: "text-primary",
      bg: "bg-primary/10",
      icon: Activity,
      pulse: true,
    },
    paused: {
      color: "text-amber-700",
      bg: "bg-energy/10",
      icon: Square,
      pulse: false,
    },
    archived: {
      color: "text-destructive",
      bg: "bg-destructive/10",
      icon: RefreshCw,
      pulse: false,
    },
  };

  const cfg = statusConfig[status.tenant.status as keyof typeof statusConfig] || statusConfig.paused;
  const Icon = cfg.icon;
  const ingressState = status.runtime_gates.discord_ingress_paused
    ? "paused"
    : "active";

  return (
    <div className={`bg-card rounded-xl shadow-sm p-6 ${
      status.tenant.status === "active"
        ? "border border-primary/30 shadow-[0_0_15px_rgba(90,138,60,0.08)]"
        : "border border-border"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-[11px] text-foreground/60 uppercase tracking-[0.12em]">
          Workspace Status
        </h3>
        <span
          className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}
        >
          {status.tenant.status}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center`}
        >
          <Icon
            className={`w-5 h-5 ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`}
          />
        </div>
        <div>
          <p className="font-mono text-sm text-foreground/60">Ingress: {ingressState}</p>
          <p className="text-xs text-foreground/40">
            Channel: Discord
          </p>
        </div>
      </div>
    </div>
  );
}
