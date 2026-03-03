export type TenantRole = "viewer" | "operator" | "admin" | "owner";

const TENANT_ROLE_ORDER: Record<TenantRole, number> = {
  viewer: 100,
  operator: 200,
  admin: 300,
  owner: 400,
};

export function hasMinimumTenantRole(
  currentRole: TenantRole,
  requiredRole: TenantRole
): boolean {
  return TENANT_ROLE_ORDER[currentRole] >= TENANT_ROLE_ORDER[requiredRole];
}

export function canManageTenantRuntimeData(role: TenantRole): boolean {
  return hasMinimumTenantRole(role, "operator");
}

export function canAdministerTenant(role: TenantRole): boolean {
  return hasMinimumTenantRole(role, "admin");
}

export function canExportTenantData(role: TenantRole): boolean {
  return hasMinimumTenantRole(role, "admin");
}
