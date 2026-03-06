import { BookOpen } from "lucide-react";
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

function HealthSummary({
  activeRecords,
  recent24hRecords,
}: {
  activeRecords: number;
  recent24hRecords: number;
}) {
  if (activeRecords === 0) {
    return (
      <p className="text-sm text-foreground/50 mt-1">No memories saved yet</p>
    );
  }

  if (recent24hRecords === 0) {
    return (
      <p className="text-sm text-energy mt-1">No new memories recently</p>
    );
  }

  return (
    <p className="text-sm text-primary mt-1">
      Memory is healthy &mdash; {activeRecords} active memories
    </p>
  );
}

function TierBar({
  tierCounts,
}: {
  tierCounts: { working: number; episodic: number; knowledge: number };
}) {
  const total = tierCounts.working + tierCounts.episodic + tierCounts.knowledge;

  if (total === 0) {
    return null;
  }

  const workingPct = (tierCounts.working / total) * 100;
  const episodicPct = (tierCounts.episodic / total) * 100;
  const knowledgePct = (tierCounts.knowledge / total) * 100;

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden border border-border">
        {tierCounts.working > 0 && (
          <div
            className="bg-energy"
            style={{ width: `${workingPct}%` }}
            title={`Short-term: ${tierCounts.working}`}
          />
        )}
        {tierCounts.episodic > 0 && (
          <div
            className="bg-primary"
            style={{ width: `${episodicPct}%` }}
            title={`Conversation: ${tierCounts.episodic}`}
          />
        )}
        {tierCounts.knowledge > 0 && (
          <div
            className="bg-intelligence"
            style={{ width: `${knowledgePct}%` }}
            title={`Reference: ${tierCounts.knowledge}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground/60">
          <span className="w-2 h-2 rounded-full bg-energy" />
          Short-term: {tierCounts.working}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground/60">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Conversation: {tierCounts.episodic}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground/60">
          <span className="w-2 h-2 rounded-full bg-intelligence" />
          Reference: {tierCounts.knowledge}
        </span>
      </div>
    </div>
  );
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
          Memory Health
        </h4>
        <HealthSummary activeRecords={activeRecords} recent24hRecords={recent24hRecords} />
      </div>

      {totalRecords === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen className="w-10 h-10 text-foreground/20 mb-3" aria-hidden="true" />
          <p className="text-sm text-foreground/50 max-w-xs">
            No memories yet. As you chat with your assistant, memories will appear here.
          </p>
        </div>
      ) : (
        <>
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
            <TierBar tierCounts={tierCounts} />
          </div>
        </>
      )}
    </div>
  );
}
