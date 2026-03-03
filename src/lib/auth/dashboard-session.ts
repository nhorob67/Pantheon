import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface CachedInstance {
  id: string;
  status: string;
}

interface CachedTenant {
  id: string;
  slug: string;
  name: string;
  status: string;
}

export const TENANT_SELECTION_COOKIE_NAME = "farmclaw_selected_tenant_id";

/**
 * Per-request cached instance lookup. Deduplicates the identical
 * `.from("instances").select(...).eq("customer_id", …)` query used
 * across the dashboard layout and 15+ settings pages.
 */
export const getCustomerInstance = cache(
  async (customerId: string): Promise<CachedInstance | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("instances")
      .select("id, status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data as CachedInstance | null;
  }
);

/**
 * Per-request cached tenant lookup. This is the tenant-first equivalent of
 * `getCustomerInstance` for settings flows that now use `/api/tenants/*`.
 */
export const getCustomerTenant = cache(
  async (customerId: string): Promise<CachedTenant | null> => {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const selectedTenantId = cookieStore.get(TENANT_SELECTION_COOKIE_NAME)?.value ?? null;

    if (selectedTenantId) {
      const { data: selectedTenant } = await supabase
        .from("tenants")
        .select("id, slug, name, status")
        .eq("customer_id", customerId)
        .eq("id", selectedTenantId)
        .maybeSingle();

      if (selectedTenant) {
        return selectedTenant as CachedTenant;
      }
    }

    const { data } = await supabase
      .from("tenants")
      .select("id, slug, name, status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as CachedTenant | null;
  }
);

export const getCustomerTenants = cache(
  async (customerId: string): Promise<CachedTenant[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tenants")
      .select("id, slug, name, status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);

    return Array.isArray(data) ? (data as CachedTenant[]) : [];
  }
);

interface DashboardSession {
  user: User | null;
  customerId: string | null;
}

const getDashboardSession = cache(async (): Promise<DashboardSession> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, customerId: null };
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return {
    user,
    customerId: customer?.id ?? null,
  };
});

export async function requireDashboardUser(): Promise<{
  user: User;
  customerId: string | null;
}> {
  const session = await getDashboardSession();

  if (!session.user) {
    redirect("/login");
  }

  return {
    user: session.user,
    customerId: session.customerId,
  };
}

export async function requireDashboardCustomer(): Promise<{
  user: User;
  customerId: string;
}> {
  const session = await requireDashboardUser();

  if (!session.customerId) {
    redirect("/onboarding");
  }

  return {
    user: session.user,
    customerId: session.customerId,
  };
}
