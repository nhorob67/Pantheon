import { Badge } from "./badge";

const STATUS_VARIANT: Record<
  string,
  { variant: "success" | "warning" | "error" | "info" | "neutral"; label?: string }
> = {
  completed: { variant: "success" },
  succeeded: { variant: "success" },
  approved: { variant: "success" },
  active: { variant: "success" },
  failed: { variant: "error" },
  rejected: { variant: "error" },
  approval_rejected: { variant: "error" },
  pending: { variant: "warning" },
  awaiting_approval: { variant: "warning", label: "Awaiting Approval" },
  paused_waiting_approval: { variant: "warning", label: "Awaiting Approval" },
  cancel_requested: { variant: "warning", label: "Cancel Requested" },
  expired: { variant: "warning" },
  running: { variant: "info" },
  queued: { variant: "neutral" },
  canceled: { variant: "neutral" },
  idle: { variant: "neutral" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_VARIANT[status] ?? { variant: "neutral" as const };
  const label = config.label ?? status.replace(/_/g, " ");
  return (
    <Badge variant={config.variant} className={className}>
      {label}
    </Badge>
  );
}
