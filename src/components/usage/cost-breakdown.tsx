import { formatCents } from "@/lib/utils/format";
import { SUBSCRIPTION_PRICE_CENTS } from "@/lib/utils/constants";

interface CostBreakdownProps {
  apiUsageCents: number;
}

export function CostBreakdown({ apiUsageCents }: CostBreakdownProps) {
  const total = SUBSCRIPTION_PRICE_CENTS + apiUsageCents;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
        Estimated Monthly Cost
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-foreground/60">Subscription</span>
          <span className="font-mono text-sm">
            {formatCents(SUBSCRIPTION_PRICE_CENTS)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-foreground/60">API Usage</span>
          <span className="font-mono text-sm">
            {formatCents(apiUsageCents)}
          </span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="font-display text-xl font-bold">
            {formatCents(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
