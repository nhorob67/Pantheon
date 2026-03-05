"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStripePromise } from "@/lib/stripe/stripe-client-loader";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Wheat,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

type Step = "credentials" | "payment" | "processing" | "error";

const STRIPE_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#D98C2E",
    colorBackground: "#161b0e",
    colorText: "#f0ece4",
    fontFamily: "Outfit, sans-serif",
    borderRadius: "8px",
  },
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect Stripe load failure (e.g. missing or malformed publishable key)
  useEffect(() => {
    if (step === "payment") {
      getStripePromise().then((s) => {
        if (!s) setError("Payment system failed to load. Please refresh the page.");
      });
    }
  }, [step]);

  // Handle 3DS return — detect payment_intent query param
  useEffect(() => {
    const paymentIntent = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");
    if (paymentIntent && redirectStatus === "succeeded") {
      // Returning from 3DS redirect — go straight to processing
      const storedSubId = sessionStorage.getItem("fc_signup_sub_id");
      const storedEmail = sessionStorage.getItem("fc_signup_email");
      const storedPassword = sessionStorage.getItem("fc_signup_password");
      if (storedSubId && storedEmail && storedPassword) {
        setSubscriptionId(storedSubId);
        setEmail(storedEmail);
        setPassword(storedPassword);
        setStep("processing");
      }
    }
  }, [searchParams]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-subscription",
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setSubscriptionId(data.subscriptionId);

      // Store in sessionStorage for 3DS redirect recovery
      sessionStorage.setItem("fc_signup_sub_id", data.subscriptionId);
      sessionStorage.setItem("fc_signup_email", email);
      sessionStorage.setItem("fc_signup_password", password);

      setStep("payment");
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-sm p-8 w-full max-w-md">
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

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className={`flex-1 h-1 rounded-full ${
            step === "credentials" ? "bg-accent" : "bg-accent/40"
          }`}
        />
        <div
          className={`flex-1 h-1 rounded-full ${
            step === "payment" || step === "processing"
              ? "bg-accent"
              : "bg-border"
          }`}
        />
      </div>

      {step === "credentials" && (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
            <label
              htmlFor="password"
              className="block text-sm text-text-secondary mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
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

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm text-text-secondary mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={8}
              autoComplete="new-password"
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
      )}

      {step === "payment" && clientSecret && (
        <Elements
          stripe={getStripePromise()}
          options={{ clientSecret, appearance: STRIPE_APPEARANCE, loader: "always" }}
        >
          <PaymentStep
            onSuccess={() => setStep("processing")}
            onError={(msg) => setError(msg)}
            error={error}
          />
        </Elements>
      )}

      {step === "processing" && (
        <ProcessingStep
          subscriptionId={subscriptionId!}
          email={email}
          password={password}
          onComplete={() => router.push("/onboarding")}
          onError={(msg) => {
            setError(msg);
            setStep("error");
          }}
        />
      )}

      {step === "error" && (
        <div className="text-center py-4">
          <p className="text-text-secondary text-sm mb-4">
            {error ||
              "Your payment was received but account setup is taking longer than expected. Please try signing in."}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/login")}
              className="text-accent hover:text-accent-light font-medium text-sm cursor-pointer"
            >
              Go to Sign In
            </button>
            <a
              href="mailto:support@farmclaw.com"
              className="text-text-dim hover:text-text-secondary text-sm"
            >
              Contact support@farmclaw.com
            </a>
          </div>
        </div>
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

function PaymentStep({
  onSuccess,
  onError,
  error,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
  error: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !ready) return;

    setLoading(true);
    onError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/signup`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      onError(stripeError.message || "Payment failed. Please try again.");
      setLoading(false);
      return;
    }

    // Payment succeeded without redirect
    onSuccess();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2 text-text-secondary text-sm">
        <CreditCard className="w-4 h-4" />
        <span>Payment details</span>
        <Lock className="w-3 h-3 ml-auto" />
      </div>

      <div className="min-h-[200px]">
        <PaymentElement
          onReady={() => setReady(true)}
          onLoadError={(e) =>
            onError(
              e.error?.message ||
                "Unable to load payment form. Please refresh and try again."
            )
          }
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !stripe || !elements || !ready}
        className="w-full bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Start My Subscription
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

function ProcessingStep({
  subscriptionId,
  email,
  password,
  onComplete,
  onError,
}: {
  subscriptionId: string;
  email: string;
  password: string;
  onComplete: () => void;
  onError: (msg: string) => void;
}) {
  const pollAndSignIn = useCallback(async () => {
    const MAX_POLLS = 15;
    const POLL_INTERVAL = 2000;
    // First 3 polls use check-status (gives webhook a chance — fast path)
    // Remaining polls use complete-signup (synchronous path — verifies with Stripe directly)
    const CHECK_STATUS_POLLS = 3;

    for (let i = 0; i < MAX_POLLS; i++) {
      try {
        const action = i < CHECK_STATUS_POLLS ? "check-status" : "complete-signup";
        const body: Record<string, string> =
          action === "check-status"
            ? { action, subscriptionId }
            : { action, subscriptionId, email };

        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (data.status === "complete") {
          // Sign in with the password
          const supabase = createClient();
          const { error: signInError } =
            await supabase.auth.signInWithPassword({ email, password });

          if (signInError) {
            onError(
              "Account created but sign-in failed. Please go to the login page."
            );
            return;
          }

          // Clean up sessionStorage
          sessionStorage.removeItem("fc_signup_sub_id");
          sessionStorage.removeItem("fc_signup_email");
          sessionStorage.removeItem("fc_signup_password");

          onComplete();
          return;
        }

        if (data.status === "expired") {
          onError("Signup expired. Please try again.");
          return;
        }
      } catch {
        // Network error — continue polling
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }

    // Polling exhausted
    onError(
      "Your payment was received but account setup is taking longer than expected. Please try signing in, or contact support@farmclaw.com for help."
    );
  }, [subscriptionId, email, password, onComplete, onError]);

  useEffect(() => {
    pollAndSignIn();
  }, [pollAndSignIn]);

  return (
    <div className="text-center py-8">
      <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
      <h2 className="font-headline text-lg font-semibold text-text-primary mb-2">
        Setting up your account...
      </h2>
      <p className="text-text-secondary text-sm">
        This usually takes just a few seconds.
      </p>
    </div>
  );
}
