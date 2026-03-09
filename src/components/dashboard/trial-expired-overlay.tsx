"use client";

import { useState } from "react";
import { Wheat, Loader2 } from "lucide-react";

export function TrialExpiredOverlay() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Let user retry
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 z-40 bg-background/90 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card rounded-xl border border-border shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Wheat className="w-6 h-6 text-primary" />
        </div>

        <h2 className="font-headline text-2xl font-bold text-foreground mb-2">
          Your trial has ended
        </h2>
        <p className="text-foreground/60 text-sm mb-6">
          Your farm data and settings are saved — nothing is lost.
          <br />
          Subscribe to put your AI team back to work.
        </p>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-primary hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Subscribe — $50/month"
          )}
        </button>

        <p className="text-foreground/40 text-xs mt-3">
          $1.67/day. Includes $25 monthly AI credit. Cancel anytime.
        </p>

        <p className="text-foreground/30 text-xs mt-4">
          Questions?{" "}
          <a
            href="mailto:support@farmclaw.com"
            className="text-foreground/50 hover:text-foreground/70 underline"
          >
            support@farmclaw.com
          </a>
        </p>
      </div>
    </div>
  );
}
