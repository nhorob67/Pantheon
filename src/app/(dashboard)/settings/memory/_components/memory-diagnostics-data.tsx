import { createAdminClient } from "@/lib/supabase/admin";
import { MemoryRetrievalDiagnosticsPanel } from "@/components/settings/memory-retrieval-diagnostics-panel";

export async function MemoryDiagnosticsData({ tenantId }: { tenantId: string }) {
  const admin = createAdminClient();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    totalCountQuery,
    activeCountQuery,
    tombstonedCountQuery,
    recent24hCountQuery,
    workingCountQuery,
    episodicCountQuery,
    knowledgeCountQuery,
    recentConfidenceQuery,
    latestRecordQuery,
  ] = await Promise.all([
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_tombstoned", false),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_tombstoned", true),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", oneDayAgo),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("memory_tier", "working"),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("memory_tier", "episodic"),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("memory_tier", "knowledge"),
    admin
      .from("tenant_memory_records")
      .select("confidence")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("tenant_memory_records")
      .select("created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const recentConfidenceRows = Array.isArray(recentConfidenceQuery.data)
    ? recentConfidenceQuery.data
    : [];
  const confidenceValues = recentConfidenceRows
    .map((row) => (typeof row.confidence === "number" ? row.confidence : null))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const averageConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : null;

  return (
    <MemoryRetrievalDiagnosticsPanel
      totalRecords={totalCountQuery.count || 0}
      activeRecords={activeCountQuery.count || 0}
      tombstonedRecords={tombstonedCountQuery.count || 0}
      recent24hRecords={recent24hCountQuery.count || 0}
      averageConfidence={averageConfidence}
      tierCounts={{
        working: workingCountQuery.count || 0,
        episodic: episodicCountQuery.count || 0,
        knowledge: knowledgeCountQuery.count || 0,
      }}
      latestRecordAt={
        latestRecordQuery.data && typeof latestRecordQuery.data.created_at === "string"
          ? latestRecordQuery.data.created_at
          : null
      }
    />
  );
}
