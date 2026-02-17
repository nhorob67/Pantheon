"use client";

import { useInstanceStatus } from "@/hooks/use-instance-status";
import { formatUptime } from "@/lib/utils/format";
import {
  Activity,
  RefreshCw,
  Square,
  Loader2,
} from "lucide-react";

interface InstanceStatusCardProps {
  instanceId: string;
}

export function InstanceStatusCard({ instanceId }: InstanceStatusCardProps) {
  const { status, loading } = useInstanceStatus(instanceId);

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
    running: {
      color: "text-primary",
      bg: "bg-primary/10",
      icon: Activity,
      pulse: true,
    },
    stopped: {
      color: "text-amber-700",
      bg: "bg-energy/10",
      icon: Square,
      pulse: false,
    },
    error: {
      color: "text-destructive",
      bg: "bg-destructive/10",
      icon: RefreshCw,
      pulse: false,
    },
    provisioning: {
      color: "text-intelligence",
      bg: "bg-intelligence/10",
      icon: Loader2,
      pulse: true,
    },
  };

  const cfgKey = status.status.startsWith("provisioning") ? "provisioning" : status.status;
  const cfg = statusConfig[cfgKey as keyof typeof statusConfig] || statusConfig.stopped;
  const Icon = cfg.icon;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider">
          Instance Status
        </h3>
        <span
          className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}
        >
          {status.status}
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
          <p className="font-mono text-sm text-foreground/60">
            Uptime: {formatUptime(status.uptime_seconds)}
          </p>
          <p className="text-xs text-foreground/40">
            Channel: Discord
          </p>
        </div>
      </div>
    </div>
  );
}
