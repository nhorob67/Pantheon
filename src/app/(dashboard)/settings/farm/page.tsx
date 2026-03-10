import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FarmProfileForm } from "@/components/settings/farm-profile-form";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Farm Settings" };

export default async function FarmSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<FarmSkeleton />}>
      <FarmContent customerId={customerId} />
    </Suspense>
  );
}

async function FarmContent({ customerId }: { customerId: string }) {
  const [supabase, tenant] = await Promise.all([
    createClient(),
    getCustomerTenant(customerId),
  ]);

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

  const { data: profile } = await supabase
    .from("farm_profiles")
    .select("*")
    .eq("customer_id", customerId)
    .single();

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

function FarmSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <Skeleton className="h-6 w-32 mb-1" />
      <Skeleton className="h-4 w-72 mb-6" />
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg w-32" />
      </div>
    </div>
  );
}
