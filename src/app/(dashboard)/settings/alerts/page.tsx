import type { Metadata } from "next";
import { AlertPreferencesForm } from "@/components/settings/alert-preferences-form";
import { createClient } from "@/lib/supabase/server";
import {
  getCustomerTenant,
  requireDashboardCustomer,
} from "@/lib/auth/dashboard-session";
import { redirect } from "next/navigation";
import { DiscordCompletionNotificationsCard } from "@/components/settings/discord-completion-notifications-card";

export const metadata: Metadata = { title: "Alert Preferences | Pantheon" };

export default async function AlertSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    redirect("/onboarding");
  }

  const { data: teamProfile } = await supabase
    .from("team_profiles")
    .select("team_name, timezone, discord_completion_notifications_enabled")
    .eq("customer_id", customerId)
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">
          Alert Preferences
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Configure spending alerts and proactive notifications.
        </p>
      </div>

      <AlertPreferencesForm />
      <DiscordCompletionNotificationsCard
        tenantId={tenant.id}
        teamName={teamProfile?.team_name ?? "My Team"}
        timezone={teamProfile?.timezone ?? "America/Chicago"}
        initialEnabled={teamProfile?.discord_completion_notifications_enabled ?? true}
        context="alerts"
      />
    </div>
  );
}
