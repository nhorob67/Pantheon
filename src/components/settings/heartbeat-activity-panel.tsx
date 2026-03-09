"use client";

import { HeartbeatStrip } from "./heartbeat-strip";
import type { DayBucket } from "@/lib/queries/schedule-activity";
import type {
  HeartbeatAnalytics,
  HeartbeatBreakdownItem,
  HeartbeatRun,
  HeartbeatStats,
} from "@/types/heartbeat";

interface HeartbeatActivityPanelProps {
  dayBuckets: DayBucket[];
  recentRuns: HeartbeatRun[];
  stats: HeartbeatStats;
  analytics: HeartbeatAnalytics;
  disabled?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function formatSignalLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatCompactLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatRelativeAge(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return iso;
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = diffMinutes / 60;
  if (diffHours < 48) {
    return `${diffHours.toFixed(1)}h ago`;
  }

  return `${(diffHours / 24).toFixed(1)}d ago`;
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

function formatRunLabel(run: HeartbeatRun): string {
  if (run.error_message) {
    return run.error_message;
  }

  if (run.delivery_status === "suppressed") {
    if (run.suppressed_reason?.startsWith("busy_runtime_")) {
      return `Deferred: ${run.suppressed_reason.replaceAll("_", " ")}`;
    }
    return run.suppressed_reason
      ? `Suppressed: ${run.suppressed_reason.replaceAll("_", " ")}`
      : "Alert suppressed";
  }

  if (run.delivery_status === "deferred") {
    return run.suppressed_reason
      ? `Deferred: ${run.suppressed_reason.replaceAll("_", " ")}`
      : "Alert deferred";
  }

  if (run.delivery_status === "awaiting_approval") {
    return "Awaiting approval";
  }

  if (run.delivery_status === "preview") {
    return run.had_signal ? "Preview generated" : "Preview ran with no alert";
  }

  if (run.delivery_status === "dispatched") {
    return "Alert dispatched";
  }

  if (run.delivery_status === "queued") {
    return "Alert queued";
  }

  if (run.had_signal) {
    return "Signal detected";
  }

  return "All clear";
}

function formatRunDetails(run: HeartbeatRun): string | null {
  const decisionTrace = asRecord(run.decision_trace);
  const freshness = asRecord(run.freshness_metadata);
  const dispatch = asRecord(run.dispatch_metadata);
  const details: string[] = [];

  const selectedSignalTypes = Array.isArray(decisionTrace.selected_signal_types)
    ? decisionTrace.selected_signal_types.filter((value): value is string => typeof value === "string")
    : [];
  const signalTypes = selectedSignalTypes.length > 0
    ? selectedSignalTypes
    : Array.isArray(decisionTrace.signal_types)
      ? decisionTrace.signal_types.filter((value): value is string => typeof value === "string")
      : [];
  if (signalTypes.length > 0) {
    details.push(`Signals: ${signalTypes.map(formatSignalLabel).join(", ")}`);
  }

  const weather = asRecord(freshness.weather_severe);
  if (typeof weather.latest_expires_at === "string" && weather.latest_expires_at.length > 0) {
    details.push(`Weather expires ${formatTime(weather.latest_expires_at)}`);
  }

  const grain = asRecord(freshness.grain_price_movement);
  if (typeof grain.latest_scraped_at === "string" && grain.latest_scraped_at.length > 0) {
    details.push(`Bids ${formatRelativeAge(grain.latest_scraped_at)}`);
  }

  const emails = asRecord(freshness.unanswered_emails);
  if (
    typeof emails.oldest_matching_created_at === "string"
    && emails.oldest_matching_created_at.length > 0
  ) {
    details.push(`Oldest email ${formatRelativeAge(emails.oldest_matching_created_at)}`);
  }

  const tickets = asRecord(freshness.unreviewed_tickets);
  if (
    typeof tickets.oldest_matching_created_at === "string"
    && tickets.oldest_matching_created_at.length > 0
  ) {
    details.push(`Oldest ticket ${formatRelativeAge(tickets.oldest_matching_created_at)}`);
  }

  if (typeof dispatch.model_id === "string" && dispatch.model_id.length > 0) {
    details.push(`Model ${dispatch.model_id}`);
  }

  const guardrail = asRecord(dispatch.guardrail_ref);
  if (guardrail.blocked === true) {
    const stage = typeof guardrail.stage === "string" ? guardrail.stage : "content";
    details.push(`Guardrail blocked at ${stage}`);
  }

  const approvalRef = asRecord(dispatch.approval_ref);
  if (typeof approvalRef.approval_reason === "string" && approvalRef.approval_reason.length > 0) {
    details.push(`Approval reason ${formatSignalLabel(approvalRef.approval_reason)}`);
  }

  const outputRef = asRecord(dispatch.output_ref);
  if (typeof outputRef.output_excerpt === "string" && outputRef.output_excerpt.length > 0) {
    details.push(`Sent: ${outputRef.output_excerpt}`);
  }

  return details.length > 0 ? details.join(" · ") : null;
}

function formatMs(value: number | null): string {
  if (value == null) return "-";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function BreakdownList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: HeartbeatBreakdownItem[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/55">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-foreground/40">{emptyLabel}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground/65">{formatCompactLabel(item.label)}</span>
              <span className="font-medium text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeartbeatActivityPanel({
  dayBuckets,
  recentRuns,
  stats,
  analytics,
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
          signal runs
        </span>
        <span>
          <strong className="text-foreground">{stats.today_notifications}</strong>{" "}
          notifications queued
        </span>
        <span>
          <strong className="text-foreground">{stats.today_suppressed}</strong>{" "}
          suppressed
        </span>
        <span>
          <strong className="text-foreground">{stats.today_deferred}</strong>{" "}
          deferred
        </span>
        <span>
          <strong className="text-foreground">{stats.today_awaiting_approval}</strong>{" "}
          awaiting approval
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
        <span>
          <strong className="text-foreground">{stats.active_issues}</strong>{" "}
          active issues
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <BreakdownList
          title="Delivery Outcomes"
          items={analytics.delivery_breakdown}
          emptyLabel="No heartbeat runs in the current window."
        />
        <BreakdownList
          title="Top Signals"
          items={analytics.signal_breakdown}
          emptyLabel="No recent signal types."
        />
        <BreakdownList
          title="Top Suppressions"
          items={analytics.suppression_breakdown}
          emptyLabel="No suppressed runs in the current window."
        />
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/55">
            Diagnostics
          </h4>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-foreground/65">Avg run duration</span>
              <span className="font-medium text-foreground">
                {formatMs(analytics.avg_duration_ms)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-foreground/65">P95 run duration</span>
              <span className="font-medium text-foreground">
                {formatMs(analytics.p95_duration_ms)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-foreground/65">Avg tokens / LLM run</span>
              <span className="font-medium text-foreground">
                {analytics.avg_tokens_per_llm_run?.toLocaleString() ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-foreground/65">Guardrail blocks</span>
              <span className="font-medium text-foreground">
                {analytics.runs_with_guardrail_blocks}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <BreakdownList
          title="Top Deferrals"
          items={analytics.defer_breakdown}
          emptyLabel="No deferred runs in the current window."
        />
        <BreakdownList
          title="Active Issue Age"
          items={analytics.issue_age_breakdown}
          emptyLabel="No active heartbeat issues."
        />
        <BreakdownList
          title="Guardrail Reasons"
          items={analytics.guardrail_breakdown}
          emptyLabel="No guardrail blocks in the current window."
        />
      </div>

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-foreground/60 mb-2">
            Recent Runs
          </h4>
          <div className="space-y-1.5">
            {recentRuns.slice(0, 10).map((run) => {
              const runDetails = formatRunDetails(run);

              return (
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
                        : run.delivery_status === "suppressed"
                          ? "bg-amber-400"
                          : run.delivery_status === "deferred"
                            ? "bg-blue-400"
                          : run.delivery_status === "awaiting_approval"
                            ? "bg-sky-500"
                          : run.had_signal
                          ? "bg-[#D98C2E]"
                          : "bg-[#5a8a3c]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-foreground/70">
                      {formatRunLabel(run)}
                    </div>
                    {runDetails && (
                      <div className="truncate text-[11px] text-foreground/45">
                        {runDetails}
                      </div>
                    )}
                  </div>
                  <span className="text-foreground/40 shrink-0">
                    {formatDuration(run.duration_ms)}
                  </span>
                  {run.tokens_used > 0 && (
                    <span className="text-foreground/40 shrink-0">
                      {run.tokens_used.toLocaleString()} tok
                    </span>
                  )}
                </div>
              );
            })}
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
