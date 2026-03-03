import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { sanitizeSearchForOr } from "@/lib/security/postgrest-sanitize";
import type { CustomerFilters } from "@/lib/validators/admin";

export interface CustomerRow {
  id: string;
  email: string | null;
  subscription_status: string;
  plan: string;
  created_at: string;
  farm_profiles: { farm_name: string | null; state: string }[] | null;
  instances: { id: string; status: string }[] | null;
}

export interface AdminCustomersResult {
  customers: CustomerRow[];
  total: number;
  page: number;
  per_page: number;
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
      "*, farm_profiles(farm_name, state, county, primary_crops, acres), instances(id, status)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (search) {
    const sanitized = sanitizeSearchForOr(search);
    if (sanitized.length > 0 && sanitized.length <= 200) {
      query = query.or(
        `email.ilike.%${sanitized}%,farm_profiles.farm_name.ilike.%${sanitized}%`
      );
    }
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
