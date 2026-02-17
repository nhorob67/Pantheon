import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { ApprovalInboxLazy } from "@/components/workflows/approval-inbox-lazy";
import {
  WORKFLOW_APPROVAL_FILTER_STATUSES,
  formatWorkflowApprovalStatus,
  normalizeWorkflowApprovalRecord,
  type WorkflowApprovalRecord,
} from "@/lib/workflows/approval-ui";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";

type SearchParams = Promise<{
  workflow_id?: string;
  status?: string;
  approval_id?: string;
  run_id?: string;
}>;

const uuidParamSchema = z.uuid();

function parseUuid(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = uuidParamSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseStatusFilter(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function statusTone(status: string): string {
  switch (status) {
    case "approved":
      return "text-green-300";
    case "rejected":
      return "text-red-300";
    case "expired":
      return "text-amber-300";
    case "canceled":
      return "text-slate-300";
    case "pending":
    default:
      return "text-amber-200";
  }
}

function buildApprovalsHref(input: {
  workflowId?: string | null;
  status?: string | null;
  approvalId?: string | null;
  runId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.workflowId) {
    params.set("workflow_id", input.workflowId);
  }
  if (input.status) {
    params.set("status", input.status);
  }
  if (input.runId) {
    params.set("run_id", input.runId);
  }
  if (input.approvalId) {
    params.set("approval_id", input.approvalId);
  }

  const query = params.toString();
  return query.length > 0
    ? `/settings/workflows/approvals?${query}`
    : "/settings/workflows/approvals";
}

export default async function WorkflowApprovalsPage({
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
  const workflowIdFilter = parseUuid(query.workflow_id);
  const selectedApprovalIdFromQuery = parseUuid(query.approval_id);
  const runIdFilter = parseUuid(query.run_id);
  const statusFilter = parseStatusFilter(query.status);

  const instance = await getCustomerInstance(customerId);

  if (!instance) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-headline text-lg font-semibold">Workflow Approvals</h3>
          <p className="text-sm text-foreground/60">
            Provision your instance first to review and action workflow approvals.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [workflowsResult, approvalsResult] = await Promise.all([
    supabase
      .from("workflow_definitions")
      .select("id, name")
      .eq("instance_id", instance.id)
      .eq("customer_id", customerId)
      .order("name", { ascending: true }),
    (async () => {
      let queryBuilder = supabase
        .from("workflow_approvals")
        .select("*")
        .eq("instance_id", instance.id)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(250);

      if (workflowIdFilter) {
        queryBuilder = queryBuilder.eq("workflow_id", workflowIdFilter);
      }

      if (statusFilter) {
        queryBuilder = queryBuilder.eq("status", statusFilter);
      }

      if (runIdFilter) {
        queryBuilder = queryBuilder.eq("run_id", runIdFilter);
      }

      return queryBuilder;
    })(),
  ]);

  const workflowRows = workflowsResult.data || [];
  const workflowNameById = new Map(workflowRows.map((workflow) => [workflow.id, workflow.name]));

  const approvalsError = approvalsResult.error?.message || null;
  const approvals = ((approvalsResult.data || []) as unknown[])
    .map((row) => normalizeWorkflowApprovalRecord(row))
    .filter((value): value is WorkflowApprovalRecord => Boolean(value));

  const selectedApproval =
    approvals.find((approval) => approval.id === selectedApprovalIdFromQuery) || approvals[0] || null;

  const selectedWorkflowName = selectedApproval
    ? workflowNameById.get(selectedApproval.workflowId) || null
    : null;

  const statusOptions = Array.from(
    new Set([
      ...WORKFLOW_APPROVAL_FILTER_STATUSES,
      ...approvals.map((approval) => approval.status),
    ])
  )
    .filter((status) => status.trim().length > 0)
    .sort((a, b) => a.localeCompare(b));

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
              Workflow Approvals
            </h3>
            <p className="text-sm text-text-dim">
              Review pending approvals, enforce SLA expectations, and approve or reject
              blocked runs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/settings/workflows/runs"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              View runs
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
            defaultValue={workflowIdFilter || ""}
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
            defaultValue={statusFilter || ""}
            className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {formatWorkflowApprovalStatus(status)}
              </option>
            ))}
          </select>

          {runIdFilter && <input type="hidden" name="run_id" value={runIdFilter} />}
          <input type="hidden" name="approval_id" value="" />

          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          >
            Apply filters
          </button>

          <Link
            href="/settings/workflows/approvals"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          >
            Reset
          </Link>
        </form>

        {runIdFilter && (
          <p className="mt-2 text-xs text-text-dim">Filtered to run ID {runIdFilter}</p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-headline text-sm font-semibold text-text-primary">
              Approvals ({approvals.length})
            </h4>
          </div>

          {approvalsError && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {approvalsError}
            </p>
          )}

          {!approvalsError && approvals.length === 0 ? (
            <p className="mt-3 text-sm text-text-dim">
              No approvals match the current filters.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {approvals.map((approval) => {
                const active = selectedApproval?.id === approval.id;
                const workflowName =
                  workflowNameById.get(approval.workflowId) ||
                  approval.workflowId ||
                  "Workflow";

                return (
                  <Link
                    key={approval.id}
                    href={buildApprovalsHref({
                      workflowId: workflowIdFilter,
                      status: statusFilter,
                      runId: runIdFilter,
                      approvalId: approval.id,
                    })}
                    className={`block rounded-xl border px-3 py-2 transition-colors ${
                      active
                        ? "border-accent/60 bg-accent/10"
                        : "border-border bg-bg-dark/40 hover:border-border-light"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-text-primary">
                        {workflowName}
                      </p>
                      <span
                        className={`text-[11px] font-medium ${statusTone(approval.status)}`}
                      >
                        {formatWorkflowApprovalStatus(approval.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-dim">
                      {formatTimestamp(approval.requestedAt || approval.createdAt)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <ApprovalInboxLazy
          instanceId={instance.id}
          approval={selectedApproval}
          workflowName={selectedWorkflowName}
        />
      </div>
    </div>
  );
}
