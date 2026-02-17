import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type { CustomerFilters, InstanceFilters } from "@/lib/validators/admin";

export interface InstanceRow {
  id: string;
  status: string;
  openclaw_version: string | null;
  last_health_check: string | null;
  coolify_uuid: string | null;
  created_at: string;
  customers: { id: string; email: string | null; subscription_status: string } | null;
}

export interface CustomerRow {
  id: string;
  email: string | null;
  subscription_status: string;
  plan: string;
  created_at: string;
  farm_profiles: { farm_name: string | null; state: string }[] | null;
  instances: { id: string; status: string; openclaw_version: string | null }[] | null;
}

export interface AdminInstancesResult {
  instances: InstanceRow[];
  total: number;
  page: number;
  per_page: number;
}

export interface AdminCustomersResult {
  customers: CustomerRow[];
  total: number;
  page: number;
  per_page: number;
}

export async function getAdminInstances(
  filters: InstanceFilters
): Promise<AdminInstancesResult> {
  const { status, version, page, per_page } = filters;
  const offset = (page - 1) * per_page;
  const admin = createAdminClient();

  let query = admin
    .from("instances")
    .select(
      "*, customers(id, email, subscription_status)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (version) {
    query = query.eq("openclaw_version", version);
  }

  const { data: instances, count, error } = await query;

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load instances"));
  }

  return {
    instances: (instances || []) as InstanceRow[],
    total: count || 0,
    page,
    per_page,
  };
}

export async function getAdminCustomers(
  filters: CustomerFilters
): Promise<AdminCustomersResult> {
  const { search, status, state, page, per_page } = filters;
  const offset = (page - 1) * per_page;
  const admin = createAdminClient();

  let query = admin
    .from("customers")
    .select(
      "*, farm_profiles(farm_name, state, county, primary_crops, acres), instances(id, status, openclaw_version, last_health_check)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (search) {
    const sanitized = search.replace(/[%_.,()\\]/g, "");
    query = query.or(
      `email.ilike.%${sanitized}%,farm_profiles.farm_name.ilike.%${sanitized}%`
    );
  }
  if (status) {
    query = query.eq("subscription_status", status);
  }

  const { data: customers, count, error } = await query;

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load customers"));
  }

  let filtered = (customers || []) as CustomerRow[];
  if (state) {
    filtered = filtered.filter((customer) =>
      customer.farm_profiles?.some((profile) => profile.state === state)
    );
  }

  return {
    customers: filtered,
    total: count || 0,
    page,
    per_page,
  };
}
