import { createAdminClient } from "@/lib/supabase/admin";
import { MemoryRetrievalDiagnosticsPanel } from "@/components/settings/memory-retrieval-diagnostics-panel";

export async function MemoryDiagnosticsData({ tenantId }: { tenantId: string }) {
  const admin = createAdminClient();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Single query fetches all fields needed to compute counts in JS
  const { data: rows } = await admin
    .from("tenant_memory_records")
    .select("is_tombstoned, memory_tier, created_at, confidence")
    .eq("tenant_id", tenantId);

  const records = Array.isArray(rows) ? rows : [];

  let totalRecords = 0;
  let activeRecords = 0;
  let tombstonedRecords = 0;
  let recent24hRecords = 0;
  let workingCount = 0;
  let episodicCount = 0;
  let knowledgeCount = 0;
  let latestCreatedAt: string | null = null;
  const recentConfidenceValues: number[] = [];

  for (const row of records) {
    totalRecords++;
    if (row.is_tombstoned) {
      tombstonedRecords++;
    } else {
      activeRecords++;
    }
    if (row.created_at >= oneDayAgo) {
      recent24hRecords++;
    }
    if (row.memory_tier === "working") workingCount++;
    else if (row.memory_tier === "episodic") episodicCount++;
    else if (row.memory_tier === "knowledge") knowledgeCount++;

    if (!latestCreatedAt || row.created_at > latestCreatedAt) {
      latestCreatedAt = row.created_at;
    }
  }

  // Compute average confidence from most recent 200 records
  const sorted = records
    .slice()
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    .slice(0, 200);
  for (const row of sorted) {
    if (typeof row.confidence === "number" && Number.isFinite(row.confidence)) {
      recentConfidenceValues.push(row.confidence);
    }
  }
  const averageConfidence =
    recentConfidenceValues.length > 0
      ? recentConfidenceValues.reduce((sum, v) => sum + v, 0) / recentConfidenceValues.length
      : null;

  return (
    <MemoryRetrievalDiagnosticsPanel
      totalRecords={totalRecords}
      activeRecords={activeRecords}
      tombstonedRecords={tombstonedRecords}
      recent24hRecords={recent24hRecords}
      averageConfidence={averageConfidence}
      tierCounts={{
        working: workingCount,
        episodic: episodicCount,
        knowledge: knowledgeCount,
      }}
      latestRecordAt={latestCreatedAt}
    />
  );
}
