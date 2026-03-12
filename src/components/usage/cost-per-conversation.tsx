import { formatCents } from "@/lib/utils/format";

interface CostPerConversationProps {
  totalCostCents: number;
  totalConversations: number;
}

export function CostPerConversation({
  totalCostCents,
  totalConversations,
}: CostPerConversationProps) {
  const costPerConversation =
    totalConversations > 0
      ? Math.round(totalCostCents / totalConversations)
      : 0;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-mono text-[11px] text-foreground/60 uppercase tracking-[0.12em] mb-3">
        Cost per Conversation
      </h3>
      <div className="flex items-end gap-2">
        <span className="font-display text-2xl font-bold text-foreground">
          {totalConversations > 0 ? formatCents(costPerConversation) : "—"}
        </span>
        <span className="text-xs text-foreground/40 pb-1">avg</span>
      </div>
      <p className="text-xs text-foreground/50 mt-2">
        {totalConversations} conversation{totalConversations !== 1 ? "s" : ""}{" "}
        this month
      </p>
    </div>
  );
}
