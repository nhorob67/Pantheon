import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { ManageBillingButton } from "@/components/settings/manage-billing-button";
import { SpendingCapForm } from "@/components/settings/spending-cap-form";

export const metadata: Metadata = { title: "Billing" };

export default function BillingSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-lg font-semibold mb-1">Billing</h3>
        <p className="text-foreground/60 text-sm mb-6">
          Manage your subscription and payment method via Stripe.
        </p>

        <div className="bg-muted rounded-lg p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-foreground/40" />
            <div>
              <p className="font-medium text-sm">FarmClaw Standard</p>
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

        <ManageBillingButton />
      </div>

      <SpendingCapForm />
    </div>
  );
}
