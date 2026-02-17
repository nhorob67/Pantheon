import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface CachedInstance {
  id: string;
  status: string;
}

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
