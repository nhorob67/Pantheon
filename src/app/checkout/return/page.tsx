"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Wheat, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type Status = "loading" | "success" | "error";

function CheckoutReturn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("Missing payment session. Please try signing up again.");
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    async function pollStatus() {
      try {
        const res = await fetch(
          `/api/stripe/session-status?session_id=${sessionId}`
        );
        const data = await res.json();

        if (data.status === "complete") {
          setStatus("success");
          setTimeout(() => router.replace("/onboarding"), 2000);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          setStatus("error");
          setErrorMessage(
            "Payment verification timed out. If you were charged, your account will be activated shortly."
          );
          return;
        }

        setTimeout(pollStatus, 2000);
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          setStatus("error");
          setErrorMessage(
            "Unable to verify payment. Please contact support if you were charged."
          );
          return;
        }
        setTimeout(pollStatus, 2000);
      }
    }

    pollStatus();
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-card rounded-xl border border-border shadow-sm p-8 text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
            <h1 className="font-headline text-xl font-bold text-text-primary mb-2">
              Confirming your payment...
            </h1>
            <p className="text-text-secondary text-sm">
              This should only take a moment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <h1 className="font-headline text-xl font-bold text-text-primary mb-2">
              You&apos;re all set!
            </h1>
            <p className="text-text-secondary text-sm">
              Redirecting you to set up your farm assistant...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="font-headline text-xl font-bold text-text-primary mb-2">
              Something went wrong
            </h1>
            <p className="text-text-secondary text-sm mb-6">{errorMessage}</p>
            <Link
              href="/signup"
              className="inline-block bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-full px-6 py-3 transition-colors"
            >
              Back to Sign Up
            </Link>
          </>
        )}

        {status !== "error" && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Wheat className="w-4 h-4 text-accent" />
            <span className="text-text-dim text-xs">FarmClaw</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-deep flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-bg-card rounded-xl border border-border shadow-sm p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
            <h1 className="font-headline text-xl font-bold text-text-primary mb-2">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <CheckoutReturn />
    </Suspense>
  );
}
