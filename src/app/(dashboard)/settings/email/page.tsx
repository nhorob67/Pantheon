import { createAdminClient } from "@/lib/supabase/admin";
import { EmailIdentityForm } from "@/components/settings/email-identity-form";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";

export default async function EmailSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  const admin = createAdminClient();
  const { data: identity } = await admin
    .from("email_identities")
    .select("slug, address, sender_alias")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="font-headline text-xl font-semibold text-foreground">
          Email (Optional)
        </h2>
        <p className="text-sm text-foreground/60 mt-1">
          This is optional and separate from onboarding. Enable it only when you
          want to ingest files by email.
        </p>
      </div>
      <EmailIdentityForm initialIdentity={identity || null} />
    </div>
  );
}
