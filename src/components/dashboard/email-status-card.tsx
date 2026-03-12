"use client";

import { Mail, AlertCircle } from "lucide-react";
import Link from "next/link";

interface EmailStatusCardProps {
  receivedToday: number;
  respondedToday: number;
  failedCount: number;
}

export function EmailStatusCard({
  receivedToday,
  respondedToday,
  failedCount,
}: EmailStatusCardProps) {
  return (
    <Link
      href="/email"
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors block"
    >
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-primary" />
        <h3 className="font-headline text-sm font-semibold text-foreground">
          Email
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-2xl font-bold text-foreground">{receivedToday}</div>
          <div className="text-xs text-foreground/50">Received today</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{respondedToday}</div>
          <div className="text-xs text-foreground/50">Responded</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${failedCount > 0 ? "text-destructive" : "text-foreground"}`}>
            {failedCount}
          </div>
          <div className="text-xs text-foreground/50 flex items-center gap-1">
            {failedCount > 0 && <AlertCircle className="w-3 h-3 text-destructive" />}
            Failed
          </div>
        </div>
      </div>
    </Link>
  );
}
