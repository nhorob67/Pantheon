import { formatCents } from "@/lib/utils/format";
import {
  CONSULTANT_HOURLY_RATE_CENTS,
  AVG_CONVERSATION_MINUTES,
  SUBSCRIPTION_PRICE_CENTS,
} from "@/lib/utils/constants";

interface ConsultantComparisonProps {
  totalConversations: number;
  apiUsageCents: number;
}

export function ConsultantComparison({
  totalConversations,
  apiUsageCents,
}: ConsultantComparisonProps) {
  if (totalConversations === 0) return null;

  const consultantCostCents = Math.round(
    totalConversations *
      (AVG_CONVERSATION_MINUTES / 60) *
      CONSULTANT_HOURLY_RATE_CENTS
  );
  const pantheonCost = SUBSCRIPTION_PRICE_CENTS + apiUsageCents;
  const savings = consultantCostCents - pantheonCost;

  if (savings <= 0) return null;

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
      <h3 className="font-mono text-[11px] text-primary uppercase tracking-[0.12em] mb-3">
        Value Comparison
      </h3>
      <p className="text-sm text-foreground/70">
        Your assistant handled{" "}
        <span className="font-semibold">{totalConversations} conversations</span>{" "}
        for <span className="font-semibold">{formatCents(pantheonCost)}</span>.
      </p>
      <p className="text-sm text-foreground/70 mt-1">
        A consultant at $150/hr would cost{" "}
        <span className="font-semibold">{formatCents(consultantCostCents)}</span>.
      </p>
      <p className="text-lg font-bold text-primary mt-3">
        Saving you {formatCents(savings)} this month
      </p>
    </div>
  );
}
