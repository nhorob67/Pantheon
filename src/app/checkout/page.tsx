"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe/stripe-client-loader";
import { Wheat, Loader2, AlertCircle } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-embedded-checkout" }),
    });

    const data = await res.json();

    if (data.error === "already_subscribed") {
      router.replace("/dashboard");
      return "";
    }

    if (data.error) {
      setError(data.error);
      throw new Error(data.error);
    }

    return data.clientSecret;
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="font-headline text-xl font-bold text-text-primary mb-2">
            Something went wrong
          </h1>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-full px-6 py-3 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col items-center p-4 pt-12">
      <div className="max-w-lg w-full text-center mb-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mb-4">
          <Wheat className="w-6 h-6 text-accent" />
        </div>
        <h1 className="font-headline text-2xl font-bold text-text-primary">
          Complete Your Subscription
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          $50/month base — includes $25 of AI usage. Cancel anytime.
        </p>
      </div>

      <div className="w-full max-w-lg">
        <EmbeddedCheckoutProvider
          stripe={getStripePromise()}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>

      <div className="mt-8 flex items-center gap-2 text-text-dim text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading secure checkout...
      </div>
    </div>
  );
}
