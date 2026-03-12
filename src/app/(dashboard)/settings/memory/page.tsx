import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { MemorySettingsPanel } from "@/components/settings/memory-settings-panel";
import { buildDefaultMemorySettings } from "@/types/memory";
import { MemoryDiagnosticsData } from "./_components/memory-diagnostics-data";

export const metadata: Metadata = { title: "Memory" };

export default async function MemorySettingsPage() {
  const [{ customerId }, supabase] = await Promise.all([
    requireDashboardCustomer(),
    createClient(),
  ]);
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Memory</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Complete your team setup before configuring memory settings.
          </p>
        </div>
      </div>
    );
  }

  const { data: settings } = await supabase
    .from("tenant_memory_settings")
    .select(
      "tenant_id, customer_id, mode, capture_level, retention_days, exclude_categories, auto_checkpoint, auto_compress, updated_by, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const initialSettings =
    settings || buildDefaultMemorySettings(tenant.id, customerId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Memory</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Control what your assistant remembers between conversations.
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
