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
          Retrieval Diagnostics (Preview)
        </h4>
        <p className="text-sm text-foreground/60 mt-1">
          Early memory health signals for retrieval tuning and context quality checks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Total records</p>
          <p className="text-base font-semibold text-foreground">{totalRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Active records</p>
          <p className="text-base font-semibold text-foreground">{activeRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Tombstoned</p>
          <p className="text-base font-semibold text-foreground">{tombstonedRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Last 24h writes</p>
          <p className="text-base font-semibold text-foreground">{recent24hRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Avg confidence (recent sample)</p>
          <p className="text-base font-semibold text-foreground">{confidenceLabel}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs text-foreground/60">Latest record</p>
          <p className="text-sm font-semibold text-foreground">{formatDate(latestRecordAt)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background px-3 py-3">
        <p className="text-xs text-foreground/60 mb-2">Tier distribution</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <p className="text-sm text-foreground">
            Working: <span className="font-semibold">{tierCounts.working}</span>
          </p>
          <p className="text-sm text-foreground">
            Episodic: <span className="font-semibold">{tierCounts.episodic}</span>
          </p>
          <p className="text-sm text-foreground">
            Knowledge: <span className="font-semibold">{tierCounts.knowledge}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
