"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowRight, Loader2, Eye, EyeOff, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }

    setResettingPassword(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    );

    if (resetError) {
      setError("Unable to send reset email. Please try again.");
    } else {
      setResetSent(true);
    }
    setResettingPassword(false);
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-sm p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="font-headline text-3xl font-bold text-text-primary">
          Pantheon
        </h1>
        <p className="mt-2 text-text-secondary">
          Sign in to your farm assistant
        </p>
      </div>

      {resetSent ? (
        <div className="text-center py-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-accent" />
          </div>
          <h2 className="font-headline text-lg font-semibold mb-2">
            Check your email
          </h2>
          <p className="text-text-secondary text-sm">
            We sent a password reset link to <strong>{email}</strong>.
          </p>
          <button
            onClick={() => setResetSent(false)}
            className="mt-4 text-accent hover:text-accent-light text-sm font-medium cursor-pointer"
          >
            Back to sign in
          </button>
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
              autoComplete="email"
              className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 text-text-primary placeholder:text-text-dim outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm text-text-secondary"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resettingPassword}
                className="text-xs text-accent hover:text-accent-light font-medium cursor-pointer disabled:opacity-50"
              >
                {resettingPassword ? "Sending..." : "Forgot password?"}
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 pr-11 text-text-primary placeholder:text-text-dim outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-dim">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-accent hover:text-accent-light font-medium"
        >
          Get started
        </Link>
      </p>
    </div>
  );
}
