"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, Wheat } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=checkout`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
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

      {sent ? (
        <div className="text-center py-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-accent" />
          </div>
          <h2 className="font-headline text-lg font-semibold mb-2">
            Check your email
          </h2>
          <p className="text-text-secondary text-sm">
            We sent a magic link to <strong>{email}</strong>. Click it to
            continue to payment.
          </p>
        </div>
      ) : (
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
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

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
