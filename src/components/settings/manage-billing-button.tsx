"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { isValidStripeUrl } from "@/lib/security/validate-redirect";

export function ManageBillingButton() {
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
  );
}
