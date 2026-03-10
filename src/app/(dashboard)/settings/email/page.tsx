import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailIdentityForm } from "@/components/settings/email-identity-form";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { Skeleton } from "@/components/ui/skeleton";

export default async function EmailSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

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
      <Suspense fallback={<EmailSkeleton />}>
        <EmailContent customerId={customerId} />
      </Suspense>
    </div>
  );
}

async function EmailContent({ customerId }: { customerId: string }) {
  const admin = createAdminClient();
  const { data: identity } = await admin
    .from("email_identities")
    .select("slug, address, sender_alias")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .maybeSingle();

  return <EmailIdentityForm initialIdentity={identity || null} />;
}

function EmailSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <Skeleton className="h-10 rounded-lg mb-4" />
      <Skeleton className="h-10 rounded-lg mb-4" />
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}
