import { Tooltip } from "@/components/ui/tooltip";

interface MemoryRetrievalDiagnosticsPanelProps {
  totalRecords: number;
  activeRecords: number;
  tombstonedRecords: number;
  recent24hRecords: number;
  averageConfidence: number | null;
  tierCounts: {
    working: number;
    episodic: number;
    knowledge: number;
  };
  latestRecordAt: string | null;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "n/a";
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return value;
  }
  return dt.toLocaleString();
}

export function MemoryRetrievalDiagnosticsPanel({
  totalRecords,
  activeRecords,
  tombstonedRecords,
  recent24hRecords,
  averageConfidence,
  tierCounts,
  latestRecordAt,
}: MemoryRetrievalDiagnosticsPanelProps) {
  const confidenceLabel =
    averageConfidence === null ? "n/a" : `${Math.round(averageConfidence * 100)}%`;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
      <div>
        <h4 className="font-headline text-base font-semibold text-foreground">
          Memory Health (Preview)
        </h4>
        <p className="text-sm text-foreground/60 mt-1">
          A snapshot of what your assistant has remembered and how well it&apos;s working.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Total memories</p>
          <p className="text-base font-semibold text-foreground">{totalRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Active memories</p>
          <p className="text-base font-semibold text-foreground">{activeRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Expired</p>
          <p className="text-base font-semibold text-foreground">{tombstonedRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">New in last 24 hours</p>
          <p className="text-base font-semibold text-foreground">{recent24hRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">
            Average confidence
            <Tooltip text="How certain your assistant is about its saved memories, based on a recent sample. Higher is better." />
          </p>
          <p className="text-base font-semibold text-foreground">{confidenceLabel}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Most recent memory</p>
          <p className="text-sm font-semibold text-foreground">{formatDate(latestRecordAt)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background px-3 py-3">
        <p className="text-xs text-foreground/60 mb-2">
          Memory breakdown
          <Tooltip text="Short-term memories are from recent conversations. Conversation memories are from earlier chats. Reference memories are long-term facts." />
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <p className="text-sm text-foreground">
            Short-term: <span className="font-semibold">{tierCounts.working}</span>
          </p>
          <p className="text-sm text-foreground">
            Conversation: <span className="font-semibold">{tierCounts.episodic}</span>
          </p>
          <p className="text-sm text-foreground">
            Reference: <span className="font-semibold">{tierCounts.knowledge}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
