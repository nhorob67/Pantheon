import { createAdminClient } from "@/lib/supabase/admin";
import { TenantApprovalsInboxCard } from "@/components/dashboard/tenant-approvals-inbox-card";

interface DashboardApprovalsProps {
  tenantId: string;
}

export async function DashboardApprovals({ tenantId }: DashboardApprovalsProps) {
  const admin = createAdminClient();

  const [pendingCountQuery, pendingRowsQuery] = await Promise.all([
    admin
      .from("tenant_approvals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending"),
    admin
      .from("tenant_approvals")
      .select("id, approval_type, required_role, created_at, request_payload")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const pendingApprovalCount = pendingCountQuery.count || 0;
  const pendingApprovals = Array.isArray(pendingRowsQuery.data)
    ? (pendingRowsQuery.data as Array<{
        id: string;
        approval_type: "tool" | "export" | "runtime" | "policy";
        required_role: string;
        created_at: string;
        request_payload: Record<string, unknown>;
      }>)
    : [];

  return (
    <TenantApprovalsInboxCard
      pendingCount={pendingApprovalCount}
      pendingApprovals={pendingApprovals}
    />
  );
}
