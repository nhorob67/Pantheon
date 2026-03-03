import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { TenantExportsPanel } from "@/components/settings/tenant-exports-panel";

export default async function ExportsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">Exports</h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before requesting data exports.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_exports")
    .select(
      "id, export_scope, format, include_blobs, status, file_count, total_size_bytes, created_at, updated_at, expires_at, last_error"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(25);

  const initialExports = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Exports</h3>
        <p className="text-foreground/60 text-sm">
          Queue tenant export bundles, review job history, and download signed manifest files.
        </p>
      </div>

      <TenantExportsPanel
        tenantId={tenant.id}
        initialExports={initialExports as Array<{
          id: string;
          export_scope: "full" | "knowledge_only" | "metadata_only";
          format: "jsonl" | "csv";
          include_blobs: boolean;
          status: "queued" | "running" | "completed" | "failed" | "expired" | "canceled";
          file_count: number;
          total_size_bytes: number;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
          last_error: string | null;
        }>}
      />
    </div>
  );
}
