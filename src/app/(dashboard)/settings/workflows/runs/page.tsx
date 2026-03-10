import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerInstance, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { formatDateTime } from "@/lib/utils/format";
import { getWorkflowRunDetail, listWorkflowRuns } from "@/lib/queries/workflow-runs";
import { listWorkflowRunsQuerySchema } from "@/lib/validators/workflow";
import { Suspense } from "react";
import { RunTimelineLazy } from "@/components/workflows/run-timeline-lazy";
import { WORKFLOW_RUN_STATUSES, type WorkflowRunStatus } from "@/types/workflow";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";

type SearchParams = Promise<{
  workflow_id?: string;
  status?: string;
  limit?: string;
  offset?: string;
  run_id?: string;
  started_from?: string;
  started_to?: string;
  min_duration_seconds?: string;
  max_duration_seconds?: string;
}>;

const runIdParamSchema = z.uuid();

function parseRunId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = runIdParamSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function formatTimestamp(value: string): string {
  return formatDateTime(value);
}

function statusTone(status: WorkflowRunStatus): string {
  switch (status) {
    case "succeeded":
      return "text-green-300";
    case "failed":
      return "text-red-300";
    case "approval_rejected":
      return "text-rose-300";
    case "running":
      return "text-blue-300";
    case "awaiting_approval":
    case "paused_waiting_approval":
      return "text-amber-200";
    case "cancel_requested":
      return "text-amber-200";
    case "canceled":
      return "text-slate-300";
    case "queued":
    default:
      return "text-text-secondary";
  }
}

function formatRunStatus(status: WorkflowRunStatus): string {
  return status.replace(/_/g, " ");
}

function buildRunsHref(input: {
  workflowId?: string | null;
  status?: WorkflowRunStatus | null;
  limit?: number;
  offset?: number;
  runId?: string | null;
  startedFrom?: string | null;
  startedTo?: string | null;
  minDurationSeconds?: number | null;
  maxDurationSeconds?: number | null;
}): string {
  const params = new URLSearchParams();

  if (input.workflowId) {
    params.set("workflow_id", input.workflowId);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (typeof input.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (typeof input.offset === "number") {
    params.set("offset", String(input.offset));
  }

  if (input.startedFrom) {
    params.set("started_from", input.startedFrom);
  }

  if (input.startedTo) {
    params.set("started_to", input.startedTo);
  }

  if (typeof input.minDurationSeconds === "number") {
    params.set("min_duration_seconds", String(input.minDurationSeconds));
  }

  if (typeof input.maxDurationSeconds === "number") {
    params.set("max_duration_seconds", String(input.maxDurationSeconds));
  }

  if (input.runId) {
    params.set("run_id", input.runId);
  }

  const query = params.toString();
  return query.length > 0 ? `/settings/workflows/runs?${query}` : "/settings/workflows/runs";
}

export default async function WorkflowRunsPage({
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

  const [instance, tenant] = await Promise.all([
    getCustomerInstance(customerId),
    getCustomerTenant(customerId),
  ]);

  if (!instance || !tenant) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-headline text-lg font-semibold">Workflow Runs</h3>
          <p className="text-sm text-foreground/60">
            Provision your instance first to view runtime execution history.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const parsedQuery = listWorkflowRunsQuerySchema.safeParse({
    workflow_id: query.workflow_id || undefined,
    status: query.status || undefined,
    limit: query.limit || undefined,
    offset: query.offset || undefined,
    started_from: query.started_from || undefined,
    started_to: query.started_to || undefined,
    min_duration_seconds: query.min_duration_seconds || undefined,
    max_duration_seconds: query.max_duration_seconds || undefined,
  });

  const filters = parsedQuery.success
    ? parsedQuery.data
    : listWorkflowRunsQuerySchema.parse({});

  const selectedRunIdFromQuery = parseRunId(query.run_id);

  const [runs, workflows] = await Promise.all([
    listWorkflowRuns(supabase, {
      instanceId: instance.id,
      customerId,
      workflowId: filters.workflow_id,
      status: filters.status,
      limit: filters.limit,
      offset: filters.offset,
      startedFrom: filters.started_from,
      startedTo: filters.started_to,
      minDurationSeconds: filters.min_duration_seconds,
      maxDurationSeconds: filters.max_duration_seconds,
    }),
    supabase
      .from("workflow_definitions")
      .select("id, name")
      .eq("instance_id", instance.id)
      .eq("customer_id", customerId)
      .order("name", { ascending: true }),
  ]);

  const workflowRows = workflows.data || [];
  const workflowNameById = new Map(workflowRows.map((workflow) => [workflow.id, workflow.name]));
  const selectedRunId = selectedRunIdFromQuery || runs[0]?.id || null;

  let selectedRunDetail = selectedRunId
    ? await getWorkflowRunDetail(supabase, instance.id, customerId, selectedRunId)
    : null;

  if (!selectedRunDetail && runs.length > 0 && selectedRunId !== runs[0].id) {
    selectedRunDetail = await getWorkflowRunDetail(
      supabase,
      instance.id,
      customerId,
      runs[0].id
    );
  }

  const selectedRunWorkflowName = selectedRunDetail
    ? workflowNameById.get(selectedRunDetail.run.workflow_id) || null
    : null;

  const hasPreviousPage = filters.offset > 0;
  const hasNextPage = runs.length >= filters.limit;

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
              Workflow Runs
            </h3>
            <p className="text-sm text-text-dim">
              Query run and step execution history from runtime events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/settings/workflows/approvals"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              View approvals
            </Link>
            <Link
              href="/settings/workflows/launch"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              Launch readiness
            </Link>
          </div>
        </div>

        <form className="mt-4 flex flex-wrap items-center gap-2" method="GET">
          <select
            name="workflow_id"
            defaultValue={filters.workflow_id || ""}
            className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
          >
            <option value="">All workflows</option>
            {workflowRows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={filters.status || ""}
            className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
          >
            <option value="">All statuses</option>
            {WORKFLOW_RUN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatRunStatus(status)}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="started_from"
            defaultValue={filters.started_from || ""}
            className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
            aria-label="Started from date"
          />

          <input
            type="date"
            name="started_to"
            defaultValue={filters.started_to || ""}
            className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
            aria-label="Started to date"
          />

          <input
            type="number"
            min={0}
            name="min_duration_seconds"
            defaultValue={filters.min_duration_seconds ?? ""}
            placeholder="Min duration (s)"
            className="w-[160px] rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
          />

          <input
            type="number"
            min={0}
            name="max_duration_seconds"
            defaultValue={filters.max_duration_seconds ?? ""}
            placeholder="Max duration (s)"
            className="w-[160px] rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
          />

          <input type="hidden" name="limit" value={String(filters.limit)} />
          <input type="hidden" name="offset" value="0" />

          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          >
            Apply filters
          </button>

          <Link
            href="/settings/workflows/runs"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          >
            Reset
          </Link>
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-headline text-sm font-semibold text-text-primary">
              Runs ({runs.length})
            </h4>
            <p className="text-xs text-text-dim">Offset {filters.offset}</p>
          </div>

          {runs.length === 0 ? (
            <p className="mt-3 text-sm text-text-dim">No runs match the current filters.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {runs.map((run) => {
                const runName = workflowNameById.get(run.workflow_id) || "Workflow";
                const active = selectedRunDetail?.run.id === run.id;

                return (
                  <Link
                    key={run.id}
                    href={buildRunsHref({
                      workflowId: filters.workflow_id || null,
                      status: filters.status || null,
                      limit: filters.limit,
                      offset: filters.offset,
                      startedFrom: filters.started_from || null,
                      startedTo: filters.started_to || null,
                      minDurationSeconds: filters.min_duration_seconds ?? null,
                      maxDurationSeconds: filters.max_duration_seconds ?? null,
                      runId: run.id,
                    })}
                    className={`block rounded-xl border px-3 py-2 transition-colors ${
                      active
                        ? "border-accent/60 bg-accent/10"
                        : "border-border bg-bg-dark/40 hover:border-border-light"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-text-primary">
                        {runName}
                      </p>
                      <span className={`text-[11px] font-medium ${statusTone(run.status)}`}>
                        {formatRunStatus(run.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-dim">
                      {formatTimestamp(run.created_at)} | v{run.source_version}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            {hasPreviousPage ? (
              <Link
                href={buildRunsHref({
                  workflowId: filters.workflow_id || null,
                  status: filters.status || null,
                  limit: filters.limit,
                  offset: Math.max(0, filters.offset - filters.limit),
                  startedFrom: filters.started_from || null,
                  startedTo: filters.started_to || null,
                  minDurationSeconds: filters.min_duration_seconds ?? null,
                  maxDurationSeconds: filters.max_duration_seconds ?? null,
                })}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-dim opacity-60">
                Previous
              </span>
            )}

            {hasNextPage ? (
              <Link
                href={buildRunsHref({
                  workflowId: filters.workflow_id || null,
                  status: filters.status || null,
                  limit: filters.limit,
                  offset: filters.offset + filters.limit,
                  startedFrom: filters.started_from || null,
                  startedTo: filters.started_to || null,
                  minDurationSeconds: filters.min_duration_seconds ?? null,
                  maxDurationSeconds: filters.max_duration_seconds ?? null,
                })}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-dim opacity-60">
                Next
              </span>
            )}
          </div>
        </section>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-bg-card/80 p-8 flex items-center justify-center">
              <p className="text-sm text-text-dim">Loading timeline...</p>
            </div>
          }
        >
          <RunTimelineLazy
            tenantId={tenant.id}
            run={selectedRunDetail?.run || null}
            steps={selectedRunDetail?.steps || []}
            artifacts={selectedRunDetail?.artifacts || []}
            workflowName={selectedRunWorkflowName}
          />
        </Suspense>
      </div>
    </div>
  );
}
