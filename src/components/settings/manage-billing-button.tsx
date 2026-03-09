"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { isValidStripeUrl } from "@/lib/security/validate-redirect";

interface ManageBillingButtonProps {
  isTrial?: boolean;
}

export function ManageBillingButton({ isTrial }: ManageBillingButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    if (isTrial) {
      // Trial/expired users go through the subscribe endpoint
      const res = await fetch("/api/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
      setLoading(false);
      return;
    }

    // Paid users go to the Stripe customer portal
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
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ExternalLink className="w-4 h-4" />
      )}
      {isTrial ? "Subscribe — $50/month" : "Manage Billing"}
    </button>
  );
}
