import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { TenantApprovalsPanel } from "@/components/settings/tenant-approvals-panel";

export default async function TenantApprovalsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">Approvals</h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before reviewing runtime approvals.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_approvals")
    .select("id, approval_type, status, required_role, request_payload, created_at")
    .eq("tenant_id", tenant.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  const approvals = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Approvals</h3>
        <p className="text-foreground/60 text-sm">
          Review high-risk tenant tool calls and heartbeat alerts, then approve or reject queued requests.
        </p>
      </div>

      <TenantApprovalsPanel
        tenantId={tenant.id}
        initialApprovals={approvals as Array<{
          id: string;
          approval_type: string;
          status: "pending" | "approved" | "rejected" | "expired" | "canceled";
          required_role: string;
          request_payload: Record<string, unknown>;
          created_at: string;
        }>}
        initialStatus="pending"
      />
    </div>
  );
}
