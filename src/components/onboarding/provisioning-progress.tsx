"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Rocket } from "lucide-react";

const PROVISION_STEPS = [
  { label: "Creating your workspace" },
  { label: "Setting up farm profile" },
  { label: "Configuring your assistant" },
  { label: "Going live" },
];

export function ProvisioningProgress() {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= PROVISION_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const allDone = currentIdx >= PROVISION_STEPS.length - 1;

  return (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-energy/10 flex items-center justify-center mb-6">
        <Rocket
          className={`w-8 h-8 text-energy ${allDone ? "" : "animate-bounce"}`}
        />
      </div>

      <h2 className="font-headline text-xl font-semibold mb-2">
        {allDone ? "You're live!" : "Launching your FarmClaw..."}
      </h2>
      <p className="text-foreground/60 text-sm mb-8">
        {allDone
          ? "Your AI farm assistant is ready to go."
          : "Just a moment..."}
      </p>

      <div className="max-w-xs mx-auto space-y-3 text-left">
        {PROVISION_STEPS.map((step, i) => {
          const status =
            i < currentIdx
              ? "complete"
              : i === currentIdx
                ? "active"
                : "pending";
          return (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  status === "complete"
                    ? "bg-primary text-white"
                    : status === "active"
                      ? "bg-energy text-white"
                      : "bg-muted text-foreground/30"
                }`}
              >
                {status === "complete" ? (
                  <Check className="w-4 h-4" />
                ) : status === "active" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </div>
              <span
                className={`text-sm ${
                  status === "pending"
                    ? "text-foreground/30"
                    : "text-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
