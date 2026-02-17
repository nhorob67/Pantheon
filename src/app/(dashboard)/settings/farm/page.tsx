import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FarmProfileForm } from "@/components/settings/farm-profile-form";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";

export default async function FarmSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();

  const [{ data: profile }, instance] = await Promise.all([
    supabase
      .from("farm_profiles")
      .select("*")
      .eq("customer_id", customerId)
      .single(),
    getCustomerInstance(customerId),
  ]);

  if (!profile) redirect("/onboarding");

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-lg font-semibold mb-1">Farm Profile</h3>
      <p className="text-foreground/60 text-sm mb-6">
        Update your farm details. Changes will restart your assistant.
      </p>
      <FarmProfileForm profile={profile} instanceId={instance?.id || null} />
    </div>
  );
}
