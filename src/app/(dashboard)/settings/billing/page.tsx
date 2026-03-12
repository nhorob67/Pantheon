import { Suspense } from "react";
import type { Metadata } from "next";
import { CreditCard, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { ManageBillingButton } from "@/components/settings/manage-billing-button";
import { SpendingCapForm } from "@/components/settings/spending-cap-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent customerId={customerId} />
    </Suspense>
  );
}

async function BillingContent({ customerId }: { customerId: string }) {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("subscription_status, trial_ends_at")
    .eq("id", customerId)
    .single();

  const subscriptionStatus = customer?.subscription_status || "active";
  const trialEndsAt = customer?.trial_ends_at || null;

  const isTrialing = subscriptionStatus === "trialing";
  const serverNow = new Date().getTime();
  const isExpired =
    subscriptionStatus === "expired" ||
    (isTrialing && trialEndsAt && new Date(trialEndsAt).getTime() < serverNow);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Manage your subscription and payment method.
        </p>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">

        {isExpired ? (
          <TrialExpiredCard trialEndsAt={trialEndsAt} />
        ) : isTrialing && trialEndsAt ? (
          <TrialActiveCard trialEndsAt={trialEndsAt} now={serverNow} />
        ) : (
          <ActiveCard />
        )}

        <div className="mt-4">
          <ManageBillingButton isTrial={isTrialing || isExpired} />
        </div>
      </div>

      <SpendingCapForm />
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <Skeleton className="h-6 w-20 mb-1" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-24 rounded-lg mb-6" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

function TrialActiveCard({ trialEndsAt, now }: { trialEndsAt: string; now: number }) {
  const diff = new Date(trialEndsAt).getTime() - now;
  const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  const endsDate = new Date(trialEndsAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-muted rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-sm">Free Trial</p>
            <p className="text-xs text-foreground/50">
              {daysLeft} days remaining &middot; Ends {endsDate}
            </p>
          </div>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          Trial
        </span>
      </div>
      <div className="bg-background rounded-md p-3 text-sm text-foreground/60">
        <p>
          Subscribe after your trial for <strong className="text-foreground">$50/month</strong>.
          Includes $25/mo AI credit. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

function TrialExpiredCard({ trialEndsAt }: { trialEndsAt: string | null }) {
  const endsDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "recently";

  return (
    <div className="bg-muted rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-foreground/40" />
          <div>
            <p className="font-medium text-sm">Trial Ended</p>
            <p className="text-xs text-foreground/50">
              Your 14-day trial ended on {endsDate}
            </p>
          </div>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
          Expired
        </span>
      </div>
      <div className="bg-background rounded-md p-3 text-sm text-foreground/60">
        <p>
          Your data and settings are safe.
          Subscribe to resume your AI team.
        </p>
      </div>
    </div>
  );
}

function ActiveCard() {
  return (
    <div className="bg-muted rounded-lg p-4 flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5 text-foreground/40" />
        <div>
          <p className="font-medium text-sm">Pantheon Standard</p>
          <p className="text-xs text-foreground/50">
            <span className="font-display text-lg font-bold text-foreground">$50</span>
            /month
            <span className="ml-2 text-primary">includes $25 API credit</span>
          </p>
        </div>
      </div>
      <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary">
        Active
      </span>
    </div>
  );
}
