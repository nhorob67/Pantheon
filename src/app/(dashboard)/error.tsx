"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-8 max-w-md text-center">
        <h2 className="font-headline text-lg font-semibold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        <button
          onClick={reset}
          className="bg-accent hover:bg-accent-light text-bg-deep rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
