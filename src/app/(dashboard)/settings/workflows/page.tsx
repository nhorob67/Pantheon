import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { formatDateTime } from "@/lib/utils/format";
import { WORKFLOW_STATUSES, type WorkflowStatus } from "@/types/workflow";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";
import { WorkflowPerformanceBeacon } from "@/components/workflows/workflow-performance-beacon";
import { WorkflowStatusToggle } from "@/components/workflows/workflow-status-toggle";

type SearchParams = Promise<{
  status?: string;
  tag?: string;
  owner?: string;
}>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseStatusFilter(status: string | undefined): WorkflowStatus | null {
  if (!status) {
    return null;
  }

  if (WORKFLOW_STATUSES.includes(status as WorkflowStatus)) {
    return status as WorkflowStatus;
  }

  return null;
}

function parseTagFilter(tag: string | undefined): string | null {
  if (!tag) {
    return null;
  }

  const normalized = tag.trim();
  if (normalized.length === 0 || normalized.length > 40) {
    return null;
  }

  return normalized;
}

function parseOwnerFilter(owner: string | undefined): string | null {
  if (!owner) {
    return null;
  }

  const normalized = owner.trim();
  if (!UUID_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function buildWorkflowsHref(input: {
  status?: WorkflowStatus | null;
  owner?: string | null;
  tag?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.status) {
    params.set("status", input.status);
  }
  if (input.owner) {
    params.set("owner", input.owner);
  }
  if (input.tag) {
    params.set("tag", input.tag);
  }

  const query = params.toString();
  return query.length > 0 ? `/settings/workflows?${query}` : "/settings/workflows";
}

function formatRelativeTimestamp(value: string): string {
  return formatDateTime(value);
}

export default async function WorkflowsSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { customerId, user } = await requireDashboardCustomer();
  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    customerId
  );

  if (!workflowBuilderEnabled) {
    notFound();
  }

  const { status, tag, owner } = await searchParams;
  const statusFilter = parseStatusFilter(status);
  const tagFilter = parseTagFilter(tag);
  const ownerFilter = parseOwnerFilter(owner);
  const instance = await getCustomerInstance(customerId);

  if (!instance) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">Workflows</h3>
          <p className="text-foreground/60 text-sm">
            Provision your instance first to manage workflow drafts and publishes.


          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from("workflow_definitions")
    .select("id, name, status, tags, owner_id, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, updated_at")
    .eq("instance_id", instance.id)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (ownerFilter) {
    query = query.eq("owner_id", ownerFilter);
  }

  if (tagFilter) {
    query = query.contains("tags", [tagFilter]);
  }

  const [{ data: workflows }, { data: workflowFilterRows }, runCountResult, successfulRunCountResult] =
    await Promise.all([
      query,
      supabase
        .from("workflow_definitions")
        .select("id, status, tags, owner_id")
        .eq("instance_id", instance.id)
        .eq("customer_id", customerId),
      supabase
        .from("workflow_runs")
        .select("id", { count: "exact", head: true })
        .eq("instance_id", instance.id)
        .eq("customer_id", customerId),
      supabase
        .from("workflow_runs")
        .select("id", { count: "exact", head: true })
        .eq("instance_id", instance.id)
        .eq("customer_id", customerId)
        .eq("status", "succeeded"),
    ]);
  const workflowRows = workflows || [];
  const allWorkflowRows = workflowFilterRows || [];
  const runCount = runCountResult.count || 0;
  const successfulRunCount = successfulRunCountResult.count || 0;
  const hasWorkflow = workflowRows.length > 0;
  const hasPublishedWorkflow = workflowRows.some(
    (workflow) => workflow.status === "published" || workflow.published_version !== null
  );
  const firstWorkflowId = workflowRows[0]?.id || null;
  const walkthroughSteps = [
    {
      id: "create",
      label: "Create your first workflow",
      href: "/settings/workflows/new",
      complete: hasWorkflow,
    },
    {
      id: "publish",
      label: "Publish the workflow from builder",
      href: firstWorkflowId
        ? `/settings/workflows/${firstWorkflowId}`
        : "/settings/workflows/new",
      complete: hasPublishedWorkflow,
    },
    {
      id: "run",
      label: "Queue a workflow run and inspect timeline",
      href: "/settings/workflows/runs",
      complete: runCount > 0,
    },
    {
      id: "review",
      label: "Review launch readiness KPI dashboard",
      href: "/settings/workflows/launch",
      complete: runCount > 0 && successfulRunCount > 0,
    },
  ];
  const completedWalkthroughSteps = walkthroughSteps.filter(
    (step) => step.complete
  ).length;

  const statusCounts = {
    all: allWorkflowRows.length,
    draft: allWorkflowRows.filter((workflow) => workflow.status === "draft").length,
    published: allWorkflowRows.filter((workflow) => workflow.status === "published")
      .length,
    archived: allWorkflowRows.filter((workflow) => workflow.status === "archived")
      .length,
  };

  const ownerOptions = Array.from(
    new Set(
      allWorkflowRows
        .map((workflow) => workflow.owner_id)
        .filter((value): value is string => typeof value === "string")
    )
  ).sort((a, b) => a.localeCompare(b));

  const tagOptions = Array.from(
    new Set(
      allWorkflowRows.flatMap((workflow) =>
        Array.isArray(workflow.tags)
          ? workflow.tags.filter((entry): entry is string => typeof entry === "string")
          : []
      )
    )
  )
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .sort((a, b) => a.localeCompare(b));

  const statusTabs: Array<{
    label: string;
    href: string;
    count: number;
    active: boolean;
  }> = [
    {
      label: "All",
      href: buildWorkflowsHref({ owner: ownerFilter, tag: tagFilter }),
      count: statusCounts.all,
      active: !statusFilter,
    },
    {
      label: "Draft",
      href: buildWorkflowsHref({
        status: "draft",
        owner: ownerFilter,
        tag: tagFilter,
      }),
      count: statusCounts.draft,
      active: statusFilter === "draft",
    },
    {
      label: "Published",
      href: buildWorkflowsHref({
        status: "published",
        owner: ownerFilter,
        tag: tagFilter,
      }),
      count: statusCounts.published,
      active: statusFilter === "published",
    },
    {
      label: "Archived",
      href: buildWorkflowsHref({
        status: "archived",
        owner: ownerFilter,
        tag: tagFilter,
      }),
      count: statusCounts.archived,
      active: statusFilter === "archived",
    },
  ];

  return (
    <div className="space-y-6">
      <WorkflowPerformanceBeacon instanceId={instance.id} routeKind="list" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-lg font-semibold mb-1">Workflows</h3>
          <p className="text-foreground/60 text-sm">
            Manage workflow drafts, validation state, and publish status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings/workflows/new"
            className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg-deep transition-colors hover:bg-accent-light"
          >
            New workflow
          </Link>
          <Link
            href="/settings/workflows/playbooks"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:border-border-light hover:text-foreground"
          >
            Playbooks
          </Link>
          <Link
            href="/settings/workflows/runs"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:border-border-light hover:text-foreground"
          >
            View runs
          </Link>
          <Link
            href="/settings/workflows/approvals"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:border-border-light hover:text-foreground"
          >
            View approvals
          </Link>
          <Link
            href="/settings/workflows/launch"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:border-border-light hover:text-foreground"
          >
            Launch readiness
          </Link>
        </div>
      </div>

      <div className="bg-muted rounded-full p-1 inline-flex flex-wrap gap-1">
        {statusTabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              tab.active
                ? "bg-card shadow-sm font-semibold text-foreground"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Owner</span>
          <Link
            href={buildWorkflowsHref({ status: statusFilter, tag: tagFilter })}
            className={`rounded-full border px-2 py-1 text-xs transition-colors ${
              !ownerFilter
                ? "border-accent/60 bg-accent/10 text-text-primary"
                : "border-border text-text-dim hover:border-border-light hover:text-text-primary"
            }`}
          >
            All owners
          </Link>
          {ownerOptions.map((ownerId) => (
            <Link
              key={ownerId}
              href={buildWorkflowsHref({
                status: statusFilter,
                owner: ownerId,
                tag: tagFilter,
              })}
              className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                ownerFilter === ownerId
                  ? "border-accent/60 bg-accent/10 text-text-primary"
                  : "border-border text-text-dim hover:border-border-light hover:text-text-primary"
              }`}
            >
              {ownerId === user.id ? "You" : `${ownerId.slice(0, 8)}...`}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Tag</span>
          <Link
            href={buildWorkflowsHref({ status: statusFilter, owner: ownerFilter })}
            className={`rounded-full border px-2 py-1 text-xs transition-colors ${
              !tagFilter
                ? "border-accent/60 bg-accent/10 text-text-primary"
                : "border-border text-text-dim hover:border-border-light hover:text-text-primary"
            }`}
          >
            All tags
          </Link>
          {tagOptions.slice(0, 16).map((tagValue) => (
            <Link
              key={tagValue}
              href={buildWorkflowsHref({
                status: statusFilter,
                owner: ownerFilter,
                tag: tagValue,
              })}
              className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                tagFilter === tagValue
                  ? "border-accent/60 bg-accent/10 text-text-primary"
                  : "border-border text-text-dim hover:border-border-light hover:text-text-primary"
              }`}
            >
              {tagValue}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-headline text-sm font-semibold text-text-primary">
            Guided Walkthrough
          </h4>
          <span className="text-xs text-text-dim">
            {completedWalkthroughSteps}/{walkthroughSteps.length} complete
          </span>
        </div>
        <p className="mt-1 text-xs text-text-dim">
          Follow this path to publish safely and finish Phase 8 launch-readiness
          checks without API usage.
        </p>

        <div className="mt-3 space-y-2">
          {walkthroughSteps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-dark/30 px-3 py-2"
            >
              <p className="text-xs text-text-secondary">
                {index + 1}. {step.label}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-medium ${
                    step.complete ? "text-green-300" : "text-amber-300"
                  }`}
                >
                  {step.complete ? "Done" : "Pending"}
                </span>
                <Link
                  href={step.href}
                  className="rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {workflowRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-foreground/70 mb-2">
            No workflows found for this instance.
          </p>
          <p className="text-xs text-foreground/50">
            Create your first workflow using the New workflow button.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflowRows.map((workflow) => {
            const validationErrors = Array.isArray(workflow.last_validation_errors)
              ? workflow.last_validation_errors.length
              : 0;

            return (
              <div
                key={workflow.id}
                className="bg-card rounded-xl border border-border shadow-sm p-4 transition-colors hover:border-border-light"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/settings/workflows/${workflow.id}`}
                      className="font-medium text-sm text-text-primary transition-colors hover:text-accent"
                    >
                      {workflow.name}
                    </Link>
                    <p className="text-xs text-foreground/60 mt-1">
                      Status: {workflow.status} • Draft v{workflow.draft_version}
                      {workflow.published_version
                        ? ` • Published v${workflow.published_version}`
                        : ""}
                    </p>
                    <p className="text-xs text-foreground/50 mt-1">
                      Owner:{" "}
                      {typeof workflow.owner_id === "string"
                        ? workflow.owner_id === user.id
                          ? "You"
                          : `${workflow.owner_id.slice(0, 8)}...`
                        : "Unassigned"}
                    </p>
                    {Array.isArray(workflow.tags) && workflow.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {workflow.tags.map((workflowTag: string) => (
                          <span
                            key={`${workflow.id}:${workflowTag}`}
                            className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-dim"
                          >
                            {workflowTag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xs font-medium ${
                        workflow.is_valid
                          ? "text-green-400"
                          : validationErrors > 0
                            ? "text-amber-300"
                            : "text-foreground/50"
                      }`}
                    >
                      {workflow.is_valid
                        ? "Valid"
                        : validationErrors > 0
                          ? `${validationErrors} issue${
                              validationErrors === 1 ? "" : "s"
                            }`
                          : "Not validated"}
                    </p>
                    <p className="text-xs text-foreground/50 mt-1">
                      Updated {formatRelativeTimestamp(workflow.updated_at)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <WorkflowStatusToggle
                        instanceId={instance.id}
                        workflowId={workflow.id}
                        workflowName={workflow.name}
                        isArchived={workflow.status === "archived"}
                      />
                      <Link
                        href={`/settings/workflows/${workflow.id}`}
                        className="inline-flex min-h-9 items-center rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
