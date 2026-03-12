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
  team_profiles: { team_name: string | null }[] | null;
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
  const { search, status, page, per_page } = filters;
  const offset = (page - 1) * per_page;
  const admin = createAdminClient();

  let query = admin
    .from("customers")
    .select(
      "*, team_profiles(team_name), instances(id, status)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (search) {
    const sanitized = sanitizeSearchForOr(search);
    if (sanitized.length > 0 && sanitized.length <= 200) {
      query = query.or(
        `email.ilike.%${sanitized}%,team_profiles.team_name.ilike.%${sanitized}%`
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

  const filtered = (customers || []) as CustomerRow[];

  return {
    customers: filtered,
    total: count || 0,
    page,
    per_page,
  };
}
