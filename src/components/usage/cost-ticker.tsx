import { formatCents } from "@/lib/utils/format";
import { SUBSCRIPTION_PRICE_CENTS } from "@/lib/utils/constants";

interface CostTickerProps {
  apiUsageCents: number;
  projectedCents: number;
  daysElapsed: number;
  daysInMonth: number;
  capCents: number | null;
}

export function CostTicker({
  apiUsageCents,
  projectedCents,
  daysElapsed,
  daysInMonth,
  capCents,
}: CostTickerProps) {
  const totalCurrent = SUBSCRIPTION_PRICE_CENTS + apiUsageCents;
  const totalProjected = SUBSCRIPTION_PRICE_CENTS + projectedCents;
  const monthProgress = Math.round((daysElapsed / daysInMonth) * 100);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-mono text-[11px] text-foreground/60 uppercase tracking-[0.12em] mb-4">
        Month-to-Date
      </h3>

      <div className="flex items-end gap-2 mb-1">
        <span className="font-display text-3xl font-bold text-foreground">
          {formatCents(totalCurrent)}
        </span>
        <span className="text-sm text-foreground/40 pb-1">current</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-foreground/50 mb-4">
        <span>Projected: {formatCents(totalProjected)}</span>
      </div>

      {/* Month progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-foreground/40 mb-1">
          <span>Day {daysElapsed}</span>
          <span>{monthProgress}% of month</span>
        </div>
        <div className="bg-muted rounded-full h-2 relative">
          <div
            className="bg-primary/30 rounded-full h-2 transition-all"
            style={{ width: `${monthProgress}%` }}
          />
        </div>
      </div>

      {/* Cap progress if set */}
      {capCents && capCents > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between text-xs text-foreground/40 mb-1">
            <span>Spending cap</span>
            <span>
              {Math.round((apiUsageCents / capCents) * 100)}% of{" "}
              {formatCents(capCents)}
            </span>
          </div>
          <div className="bg-muted rounded-full h-2">
            <div
              className={`rounded-full h-2 transition-all ${
                apiUsageCents >= capCents
                  ? "bg-destructive"
                  : apiUsageCents >= capCents * 0.8
                    ? "bg-energy"
                    : "bg-primary"
              }`}
              style={{
                width: `${Math.min(100, (apiUsageCents / capCents) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
