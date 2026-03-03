import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { formatDateTime } from "@/lib/utils/format";
import { workflowLaunchReadinessQuerySchema } from "@/lib/validators/workflow";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";
import {
  buildWorkflowLaunchReadinessSnapshot,
  listWorkflowLaunchReadinessSnapshots,
} from "@/lib/workflows/launch-readiness";

type SearchParams = Promise<{
  days?: string;
  min_samples?: string;
}>;

function formatPercent(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

function formatMinutes(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${value.toFixed(1)} min`;
}

function formatHours(value: number): string {
  return `${value.toFixed(1)} hrs`;
}

function gateTone(status: "pass" | "fail" | "insufficient_data"): string {
  switch (status) {
    case "pass":
      return "text-green-300";
    case "fail":
      return "text-red-300";
    case "insufficient_data":
    default:
      return "text-amber-300";
  }
}

function formatGateValue(value: number | null, unit: "ms" | "score"): string {
  if (value === null) {
    return "-";
  }

  if (unit === "ms") {
    return `${Math.round(value)}ms`;
  }

  return value.toFixed(3);
}

function formatSnapshotTimestamp(value: string): string {
  return formatDateTime(value);
}

export default async function WorkflowLaunchReadinessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { customerId } = await requireDashboardCustomer();
  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    customerId
  );

  if (!workflowBuilderEnabled) {
    notFound();
  }

  const query = await searchParams;
  const parsedQuery = workflowLaunchReadinessQuerySchema.safeParse({
    days: query.days || undefined,
    min_samples: query.min_samples || undefined,
  });

  const filters = parsedQuery.success
    ? parsedQuery.data
    : workflowLaunchReadinessQuerySchema.parse({});

  const instance = await getCustomerInstance(customerId);

  if (!instance) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-headline text-lg font-semibold text-text-primary">
            Workflow Launch Readiness
          </h3>
          <p className="text-sm text-text-dim">
            Provision your instance first to inspect rollout and launch readiness
            KPIs.
          </p>
        </div>
      </div>
    );
  }

  const snapshot = await buildWorkflowLaunchReadinessSnapshot(admin, {
    customerId,
    instanceId: instance.id,
    timeframeDays: filters.days,
    minSamplesPerMetric: filters.min_samples,
  });
  const snapshotHistory = await listWorkflowLaunchReadinessSnapshots(admin, {
    customerId,
    instanceId: instance.id,
    limit: 12,
  });
  const latestPersistedSnapshot = snapshotHistory[0] || null;

  const kpis = snapshot.kpis;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-bg-card/70 p-4">
        <Link
          href="/settings/workflows"
          className="text-xs text-text-dim transition-colors hover:text-text-secondary"
        >
          Back to workflows
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-headline text-lg font-semibold text-text-primary">
              Workflow Launch Readiness
            </h3>
            <p className="text-sm text-text-dim">
              Track rollout rings, launch KPIs, and weekly review readiness for the
              visual builder.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/docs/tools/workflow-builder"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              Guided walkthrough
            </Link>
            <Link
              href="/docs/tools/workflow-builder-rollout"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              Rollout strategy
            </Link>
            <Link
              href="/docs/troubleshooting/workflow-builder-support-runbook"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              Support runbook
            </Link>
            <Link
              href="/docs/tools/workflow-builder-kpi-review"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              KPI cadence
            </Link>
          </div>
        </div>

        <form className="mt-4 flex flex-wrap items-center gap-2" method="GET">
          <select
            name="days"
            defaultValue={String(filters.days)}
            className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
          >
            <option value="14">Last 14 days</option>
            <option value="28">Last 28 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>

          <select
            name="min_samples"
            defaultValue={String(filters.min_samples)}
            className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
          >
            <option value="10">10 samples floor</option>
            <option value="20">20 samples floor</option>
            <option value="40">40 samples floor</option>
          </select>

          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          >
            Refresh
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-headline text-sm font-semibold text-text-primary">
            Rollout Rings
          </h4>
          <span
            className={`text-xs font-medium ${
              snapshot.rollout.release_open_for_customer
                ? "text-green-300"
                : "text-amber-300"
            }`}
          >
            Access {snapshot.rollout.release_open_for_customer ? "open" : "deferred"}
          </span>
        </div>

        <p className="mt-1 text-xs text-text-dim">
          Assigned ring: <span className="text-text-secondary">{snapshot.rollout.assigned_ring}</span>
          {" • "}
          Target ring: <span className="text-text-secondary">{snapshot.rollout.target_ring}</span>
        </p>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {snapshot.rollout.progression.map((ring) => {
            const isCurrent = ring === snapshot.rollout.assigned_ring;
            const isOpen =
              snapshot.rollout.progression.indexOf(ring) <=
              snapshot.rollout.progression.indexOf(snapshot.rollout.target_ring);

            return (
              <div
                key={ring}
                className={`rounded-xl border px-3 py-2 text-xs ${
                  isCurrent
                    ? "border-accent/60 bg-accent/10"
                    : "border-border bg-bg-dark/30"
                }`}
              >
                <p className="font-medium text-text-primary capitalize">{ring}</p>
                <p
                  className={`mt-1 ${
                    isOpen ? "text-green-300" : "text-text-dim"
                  }`}
                >
                  {isOpen ? "Open for release" : "Held for later ring"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Time to first publish (median)</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {formatMinutes(kpis.time_to_first_publish_median_minutes)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Draft to publish completion</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {formatPercent(kpis.draft_to_publish_completion_rate_pct)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Run success rate</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {formatPercent(kpis.run_success_rate_pct)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Retry rate</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {formatPercent(kpis.retry_rate_pct)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Retry recovery success</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {formatPercent(kpis.retry_recovery_success_rate_pct)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Approval cycle time (p50)</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {formatMinutes(kpis.approval_cycle_time_p50_minutes)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Weekly active builders</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {kpis.weekly_active_builders}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-3">
          <p className="text-xs text-text-dim">Estimated operator hours saved</p>
          <p className="mt-1 font-headline text-lg text-text-primary">
            {formatHours(kpis.estimated_operator_hours_saved)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Performance Gates (p75)
        </h4>
        <p className="mt-1 text-xs text-text-dim">
          Status:{" "}
          <span className={gateTone(snapshot.performance_gates.overallStatus)}>
            {snapshot.performance_gates.overallStatus}
          </span>
          {" • "}
          Window: {snapshot.timeframe_days} days
        </p>

        <div className="mt-3 space-y-2">
          {snapshot.performance_gates.gateChecks.map((gate) => (
            <div
              key={gate.gate}
              className="rounded-xl border border-border bg-bg-dark/30 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-text-primary">
                  {gate.gate.replace(/_/g, " ")}
                </p>
                <p className={`text-xs font-medium ${gateTone(gate.status)}`}>
                  {gate.status}
                </p>
              </div>
              <p className="mt-1 text-xs text-text-dim">
                p75 {formatGateValue(gate.p75, gate.metricName === "CLS" ? "score" : "ms")}
                {" • "}
                threshold {formatGateValue(
                  gate.thresholdP75,
                  gate.metricName === "CLS" ? "score" : "ms"
                )}
                {" • "}
                samples {gate.sampleCount}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Snapshot History
        </h4>
        <p className="mt-1 text-xs text-text-dim">
          Hourly cron captures are persisted for launch-audit evidence.
          {latestPersistedSnapshot
            ? ` Latest capture: ${formatSnapshotTimestamp(
                latestPersistedSnapshot.generated_at
              )}`
            : " No persisted captures yet."}
        </p>

        {snapshotHistory.length === 0 ? (
          <p className="mt-2 text-xs text-text-dim">
            Captured history will appear after the first cron or manual capture via
            `/api/instances/:id/workflows/launch-readiness/snapshots`.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {snapshotHistory.map((historicalSnapshot) => {
              const passCount = historicalSnapshot.snapshot.performance_gates.gateChecks.filter(
                (gate) => gate.status === "pass"
              ).length;
              const failCount = historicalSnapshot.snapshot.performance_gates.gateChecks.filter(
                (gate) => gate.status === "fail"
              ).length;
              const insufficientCount = historicalSnapshot.snapshot.performance_gates.gateChecks.filter(
                (gate) => gate.status === "insufficient_data"
              ).length;

              return (
                <div
                  key={historicalSnapshot.id}
                  className="rounded-xl border border-border bg-bg-dark/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-text-secondary">
                      {formatSnapshotTimestamp(historicalSnapshot.generated_at)} •{" "}
                      {historicalSnapshot.capture_source}
                    </p>
                    <p
                      className={`text-xs font-medium ${gateTone(
                        historicalSnapshot.performance_overall_status
                      )}`}
                    >
                      {historicalSnapshot.performance_overall_status}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-text-dim">
                    Gates: pass {passCount} • fail {failCount} • insufficient{" "}
                    {insufficientCount}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Weekly Review Cadence
        </h4>
        <p className="mt-1 text-xs text-text-dim">
          {snapshot.weekly_review_cadence.day_of_week} at{" "}
          {snapshot.weekly_review_cadence.time_utc}{" "}
          {snapshot.weekly_review_cadence.timezone} • Owner:{" "}
          {snapshot.weekly_review_cadence.owner}
        </p>
        <ul className="mt-3 space-y-1 text-xs text-text-secondary">
          {snapshot.weekly_review_cadence.agenda.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
