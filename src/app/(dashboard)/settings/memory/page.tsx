import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { MemorySettingsPanel } from "@/components/settings/memory-settings-panel";
import { buildDefaultMemorySettings } from "@/types/memory";
import { MemoryDiagnosticsData } from "./_components/memory-diagnostics-data";

export const metadata: Metadata = { title: "Memory" };

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

      <Suspense fallback={<div className="h-64 rounded-xl bg-foreground/5 animate-pulse" />}>
        <MemoryDiagnosticsData tenantId={tenant.id} />
      </Suspense>
    </div>
  );
}
