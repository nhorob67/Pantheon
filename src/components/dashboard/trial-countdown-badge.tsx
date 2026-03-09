"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const subscribe = () => () => {};
const getSnapshot = () => Date.now();
const getServerSnapshot = () => Date.now();

interface TrialCountdownBadgeProps {
  trialEndsAt: string;
}

export function TrialCountdownBadge({ trialEndsAt }: TrialCountdownBadgeProps) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const diff = new Date(trialEndsAt).getTime() - now;
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  const isUrgent = days <= 3;

  return (
    <Link
      href="/settings/billing"
      className={`font-mono text-xs rounded-full px-2.5 py-1 transition-colors block text-center ${
        isUrgent
          ? "bg-primary/20 text-primary"
          : "bg-primary/10 text-primary"
      }`}
    >
      Trial: {days} {days === 1 ? "day" : "days"}
    </Link>
  );
}
