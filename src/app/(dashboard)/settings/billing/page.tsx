"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { isValidStripeUrl } from "@/lib/security/validate-redirect";
import { SpendingCapForm } from "@/components/settings/spending-cap-form";

export default function BillingSettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-portal" }),
    });

    const { url } = await res.json();
    if (url && isValidStripeUrl(url)) {
      window.location.href = url;
    }
    setLoading(false);
  };

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
                <span className="font-display text-lg font-bold text-foreground">$40</span>
                /month
              </p>
            </div>
          </div>
          <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            Active
          </span>
        </div>

        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Manage Billing
        </button>
      </div>

      <SpendingCapForm />
    </div>
  );
}
