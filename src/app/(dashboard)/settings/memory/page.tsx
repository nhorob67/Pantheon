import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { MemorySettingsPanel } from "@/components/settings/memory-settings-panel";
import { MemoryRetrievalDiagnosticsPanel } from "@/components/settings/memory-retrieval-diagnostics-panel";

export const metadata: Metadata = { title: "Memory" };
import { buildDefaultMemorySettings } from "@/types/memory";

export default async function MemorySettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">Memory</h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before configuring memory.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: mapping } = await admin
    .from("instance_tenant_mappings")
    .select("instance_id")
    .eq("tenant_id", tenant.id)
    .eq("mapping_status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!mapping?.instance_id) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">Memory</h3>
          <p className="text-foreground/60 text-sm">
            Runtime mapping is required before configuring memory mode and vault behavior.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("instance_memory_settings")
    .select(
      "instance_id, customer_id, mode, capture_level, retention_days, exclude_categories, auto_checkpoint, auto_compress, updated_by, created_at, updated_at"
    )
    .eq("instance_id", mapping.instance_id)
    .maybeSingle();

  const initialSettings =
    settings || buildDefaultMemorySettings(mapping.instance_id, customerId);

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
      .eq("tenant_id", tenant.id),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("is_tombstoned", false),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("is_tombstoned", true),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .gte("created_at", oneDayAgo),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("memory_tier", "working"),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("memory_tier", "episodic"),
    admin
      .from("tenant_memory_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("memory_tier", "knowledge"),
    admin
      .from("tenant_memory_records")
      .select("confidence")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("tenant_memory_records")
      .select("created_at")
      .eq("tenant_id", tenant.id)
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
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Memory</h3>
        <p className="text-foreground/60 text-sm">
          Control how FarmClaw stores and compresses long-lived context.
        </p>
      </div>

      <MemorySettingsPanel
        tenantId={tenant.id}
        initialSettings={initialSettings}
      />

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
    </div>
  );
}
