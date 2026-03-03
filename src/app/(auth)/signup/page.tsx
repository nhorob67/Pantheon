"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Wheat } from "lucide-react";
import { isValidStripeUrl } from "@/lib/security/validate-redirect";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create Stripe checkout session via API (customer record created server-side)
      const res = await fetch("/api/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-checkout",
          email,
        }),
      });

      const { url, error: checkoutError } = await res.json();

      if (checkoutError) {
        setError(checkoutError);
        setLoading(false);
        return;
      }

      // Redirect to Stripe checkout (validate URL to prevent open redirect)
      if (!isValidStripeUrl(url)) {
        setError("Invalid checkout URL. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-sm p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mb-4">
          <Wheat className="w-6 h-6 text-accent" />
        </div>
        <h1 className="font-headline text-3xl font-bold text-text-primary">
          Get Started
        </h1>
        <p className="mt-2 text-text-secondary">
          $50/month — your AI farm assistant, always on.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm text-text-secondary mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@farm.com"
            required
            className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 text-text-primary placeholder:text-text-dim outline-none transition-colors"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue to Payment
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-dim">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent hover:text-accent-light font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
