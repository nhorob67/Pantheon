import type { TenantStatus } from "@/types/tenant-runtime";

export function getTenantRouteTenantStatusError(
  tenantStatus: TenantStatus
): string | null {
  if (tenantStatus === "paused") {
    return "Tenant access is paused";
  }

  if (tenantStatus === "archived") {
    return "Tenant is archived";
  }

  return null;
}
