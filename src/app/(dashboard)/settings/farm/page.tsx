import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FarmProfileForm } from "@/components/settings/farm-profile-form";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";

export const metadata: Metadata = { title: "Farm Settings" };

export default async function FarmSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-lg font-semibold mb-1">Farm Profile</h3>
        <p className="text-foreground/60 text-sm">
          Tenant workspace setup is required before updating farm profile data.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: profile }] = await Promise.all([
    supabase
      .from("farm_profiles")
      .select("*")
      .eq("customer_id", customerId)
      .single(),
  ]);

  if (!profile) redirect("/onboarding");

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-lg font-semibold mb-1">Farm Profile</h3>
      <p className="text-foreground/60 text-sm mb-6">
        Update your farm details. Changes take effect immediately.
      </p>
      <FarmProfileForm profile={profile} tenantId={tenant.id} />
    </div>
  );
}
