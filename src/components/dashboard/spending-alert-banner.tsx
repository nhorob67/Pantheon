import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatCents } from "@/lib/utils/format";

interface SpendingAlertBannerProps {
  percentage: number;
  currentCents: number;
  capCents: number;
}

export function SpendingAlertBanner({
  percentage,
  currentCents,
  capCents,
}: SpendingAlertBannerProps) {
  const isCritical = percentage >= 100;

  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${
        isCritical
          ? "bg-destructive/10 border-destructive/20"
          : "bg-energy/10 border-energy/20"
      }`}
    >
      <AlertTriangle
        className={`w-5 h-5 shrink-0 ${
          isCritical ? "text-destructive" : "text-energy"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isCritical ? "text-destructive" : "text-amber-700"
          }`}
        >
          {isCritical
            ? `Spending cap exceeded (${percentage}%)`
            : `Approaching spending cap (${percentage}%)`}
        </p>
        <p className="text-xs text-foreground/50 mt-0.5">
          {formatCents(currentCents)} of {formatCents(capCents)} monthly cap
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href="/usage"
          className="text-xs font-medium underline text-foreground/60 hover:text-foreground"
        >
          Usage
        </Link>
        <Link
          href="/settings/billing"
          className="text-xs font-medium underline text-foreground/60 hover:text-foreground"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
