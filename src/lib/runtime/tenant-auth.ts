import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type { TenantRole, TenantStatus } from "@/types/tenant-runtime";
export {
  canAdministerTenant,
  canExportTenantData,
  canManageTenantRuntimeData,
  hasMinimumTenantRole,
} from "./tenant-role-policy";

interface TenantJoinRow {
  id: string;
  customer_id: string;
  slug: string;
  name: string;
  status: TenantStatus;
}

interface TenantMembershipRow {
  tenant_id: string;
  role: TenantRole;
  status: string;
  tenants: TenantJoinRow | TenantJoinRow[] | null;
}

export interface AuthorizedTenantContext {
  tenantId: string;
  customerId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: TenantStatus;
  memberRole: TenantRole;
  memberStatus: string;
}

function normalizeTenantJoin(
  value: TenantJoinRow | TenantJoinRow[] | null
): TenantJoinRow | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function resolveAuthorizedTenantContext(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<AuthorizedTenantContext | null> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, status, tenants!inner(id, customer_id, slug, name, status)")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to resolve tenant authorization context")
    );
  }

  if (!data) {
    return null;
  }

  const membership = data as TenantMembershipRow;
  const tenant = normalizeTenantJoin(membership.tenants);

  if (!tenant) {
    return null;
  }

  return {
    tenantId: tenant.id,
    customerId: tenant.customer_id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    tenantStatus: tenant.status,
    memberRole: membership.role,
    memberStatus: membership.status,
  };
}
