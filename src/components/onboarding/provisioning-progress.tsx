"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { m, LazyMotion, domAnimation } from "motion/react";
import { useRouter } from "next/navigation";

const PROVISION_STEPS = [
  { label: "Creating your workspace" },
  { label: "Setting up farm profile" },
  { label: "Configuring weather intelligence" },
  { label: "Going live" },
];

const SPRING_IN = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring" as const, stiffness: 200, damping: 20 },
};

const FADE_UP = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export function ProvisioningProgress() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= PROVISION_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const allDone = currentIdx >= PROVISION_STEPS.length - 1;

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [allDone, router]);

  return (
    <LazyMotion features={domAnimation}>
    <div className="fixed inset-0 z-50 bg-[var(--bg-deep)] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Seedling animation */}
        <m.div
          className="mx-auto w-24 h-24 mb-8 relative"
          {...SPRING_IN}
        >
          <svg
            viewBox="0 0 96 96"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Stem */}
            <m.line
              x1="48"
              y1="80"
              x2="48"
              y2="35"
              stroke="var(--green-bright)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            />
            {/* Left leaf */}
            <m.path
              d="M48 55C48 55 30 50 28 38C28 38 42 36 48 55Z"
              fill="var(--green-bright)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              style={{ transformOrigin: "48px 55px" }}
            />
            {/* Right leaf */}
            <m.path
              d="M48 45C48 45 66 40 68 28C68 28 54 26 48 45Z"
              fill="var(--green-bright)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.0, type: "spring" }}
              style={{ transformOrigin: "48px 45px" }}
            />
            {/* Wheat head */}
            <m.ellipse
              cx="48"
              cy="28"
              rx="6"
              ry="10"
              fill="var(--accent)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
            />
          </svg>

          {/* Glow */}
          {allDone && (
            <m.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background:
                  "radial-gradient(circle, rgba(217,140,46,0.2) 0%, transparent 70%)",
              }}
            />
          )}
        </m.div>

        <m.h2
          className="font-headline text-2xl font-bold text-[var(--text-primary)] mb-2"
          {...FADE_UP}
          transition={{ delay: 0.2 }}
        >
          {allDone ? "You're live!" : "Growing your Pantheon..."}
        </m.h2>
        <m.p
          className="text-sm text-[var(--text-secondary)] mb-10"
          {...FADE_IN}
          transition={{ delay: 0.3 }}
        >
          {allDone
            ? "Your AI farm assistant is ready to go."
            : "Just a moment..."}
        </m.p>

        {/* Checklist */}
        <div className="max-w-xs mx-auto space-y-3 text-left">
          {PROVISION_STEPS.map((step, i) => {
            const status =
              i < currentIdx
                ? "complete"
                : i === currentIdx
                  ? "active"
                  : "pending";
            return (
              <m.div
                key={step.label}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    status === "complete"
                      ? "bg-[var(--green-bright)] text-white"
                      : status === "active"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-card)] text-[var(--text-dim)] border border-[var(--border)]"
                  }`}
                >
                  {status === "complete" ? (
                    <m.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Check className="w-4 h-4" />
                    </m.div>
                  ) : status === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-sm transition-colors ${
                    status === "pending"
                      ? "text-[var(--text-dim)]"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {step.label}
                </span>
              </m.div>
            );
          })}
        </div>

        {/* CTA after completion */}
        {allDone && (
          <m.button
            {...FADE_UP}
            transition={{ delay: 0.5 }}
            onClick={() => router.push("/dashboard")}
            className="mt-10 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-[var(--bg-deep)] font-semibold py-3 px-8 rounded-full transition-all hover:shadow-[0_4px_20px_rgba(217,140,46,0.3)] hover:-translate-y-0.5"
          >
            Go to Dashboard
          </m.button>
        )}
      </div>
    </div>
    </LazyMotion>
  );
}
