"use client";

import { HeartbeatStrip } from "./heartbeat-strip";
import type { DayBucket } from "@/lib/queries/schedule-activity";
import type { HeartbeatRun, HeartbeatStats } from "@/types/heartbeat";

interface HeartbeatActivityPanelProps {
  dayBuckets: DayBucket[];
  recentRuns: HeartbeatRun[];
  stats: HeartbeatStats;
  disabled?: boolean;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HeartbeatActivityPanel({
  dayBuckets,
  recentRuns,
  stats,
  disabled,
}: HeartbeatActivityPanelProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-base font-semibold mb-4">Activity</h3>

      <HeartbeatStrip buckets={dayBuckets} disabled={disabled} />

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-foreground/60">
        <span>
          Today: <strong className="text-foreground">{stats.today_runs}</strong>{" "}
          check-ins
        </span>
        <span>
          <strong className="text-[#D98C2E]">{stats.today_signals}</strong>{" "}
          alerts sent
        </span>
        <span>
          <strong className="text-foreground">{stats.today_llm_invocations}</strong>{" "}
          LLM calls
        </span>
        <span>
          <strong className="text-foreground">
            {stats.today_tokens.toLocaleString()}
          </strong>{" "}
          tokens
        </span>
      </div>

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-foreground/60 mb-2">
            Recent Runs
          </h4>
          <div className="space-y-1.5">
            {recentRuns.slice(0, 10).map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 text-xs py-1.5 border-b border-border last:border-0"
              >
                <span className="text-foreground/50 w-32 shrink-0">
                  {formatTime(run.ran_at)}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    run.error_message
                      ? "bg-red-500"
                      : run.had_signal
                        ? "bg-[#D98C2E]"
                        : "bg-[#5a8a3c]"
                  }`}
                />
                <span className="flex-1 truncate text-foreground/70">
                  {run.error_message
                    ? run.error_message
                    : run.had_signal
                      ? "Signal detected"
                      : "All clear"}
                </span>
                <span className="text-foreground/40 shrink-0">
                  {formatDuration(run.duration_ms)}
                </span>
                {run.tokens_used > 0 && (
                  <span className="text-foreground/40 shrink-0">
                    {run.tokens_used.toLocaleString()} tok
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRuns.length === 0 && (
        <p className="mt-4 text-xs text-foreground/40">
          No heartbeat runs yet. Enable heartbeat and runs will appear here.
        </p>
      )}
    </div>
  );
}
