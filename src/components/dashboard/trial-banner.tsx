"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface TrialBannerProps {
  trialEndsAt: string;
}

function getDaysRemaining(trialEndsAt: string): number {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getBannerText(days: number): string {
  if (days <= 1) return "Last day of your free trial";
  if (days <= 3) return `${days} days left in your trial`;
  if (days <= 7) return `${days} days left — your AI team is just getting warmed up`;
  return `${days} days left in your free trial`;
}

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const days = getDaysRemaining(trialEndsAt);
  const isUrgent = days <= 3;

  return (
    <div
      className={`w-full border-b px-6 py-2.5 flex items-center justify-between ${
        isUrgent
          ? "bg-primary/10 border-primary/20"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className={`w-4 h-4 ${isUrgent ? "text-primary" : "text-primary/60"}`}
        />
        <span
          className={`font-headline text-sm font-medium ${
            isUrgent ? "text-primary" : "text-foreground"
          }`}
        >
          {getBannerText(days)}
        </span>
      </div>
      <Link
        href="/settings/billing"
        className="bg-primary hover:bg-primary/80 text-white font-semibold rounded-full px-4 py-1.5 text-sm transition-colors"
      >
        Subscribe — $50/month
      </Link>
    </div>
  );
}
