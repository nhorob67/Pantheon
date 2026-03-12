"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCcw, Undo2 } from "lucide-react";
import type {
  WorkflowRun,
  WorkflowRunArtifact,
  WorkflowRunStep,
  WorkflowRunStepStatus,
} from "@/types/workflow";
import { StatusBadge } from "@/components/ui/status-badge";

interface RunTimelineProps {
  tenantId: string;
  run: WorkflowRun | null;
  steps: WorkflowRunStep[];
  artifacts: WorkflowRunArtifact[];
  workflowName?: string | null;
}

type RunActionFeedback = {
  kind: "success" | "error";
  message: string;
};

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

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) {
    return "-";
  }

  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) {
    return "-";
  }

  const completed = completedAt ? new Date(completedAt) : new Date();
  if (Number.isNaN(completed.getTime())) {
    return "-";
  }

  const durationMs = Math.max(0, completed.getTime() - started.getTime());
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function stepStatusTone(status: WorkflowRunStepStatus): string {
  switch (status) {
    case "succeeded":
      return "text-green-300";
    case "failed":
      return "text-red-300";
    case "canceled":
      return "text-slate-300";
    case "running":
      return "text-blue-300";
    case "skipped":
      return "text-text-secondary";
    case "pending":
    default:
      return "text-amber-200";
  }
}

interface ErrorTaxonomy {
  label: string;
  hint: string;
}

function classifyErrorMessage(message: string | null): ErrorTaxonomy | null {
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("deadline exceeded")
  ) {
    return {
      label: "Timeout",
      hint: "Increase upstream timeout limits or split this step into smaller operations.",
    };
  }

  if (
    normalized.includes("401") ||
    normalized.includes("403") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("invalid api key") ||
    normalized.includes("token")
  ) {
    return {
      label: "Auth/Credentials",
      hint: "Rotate credentials and verify connector scopes for this workflow path.",
    };
  }

  if (
    normalized.includes("429") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return {
      label: "Rate Limit",
      hint: "Add delay or retry strategy and reduce concurrency for this integration.",
    };
  }

  if (
    normalized.includes("validation") ||
    normalized.includes("invalid") ||
    normalized.includes("schema") ||
    normalized.includes("required")
  ) {
    return {
      label: "Input/Schema",
      hint: "Review step input payload and ensure required fields match downstream schema.",
    };
  }

  if (
    normalized.includes("network") ||
    normalized.includes("connection") ||
    normalized.includes("socket") ||
    normalized.includes("dns") ||
    normalized.includes("unavailable")
  ) {
    return {
      label: "Dependency/Network",
      hint: "Check dependency health and retry after confirming upstream availability.",
    };
  }

  return {
    label: "Unknown",
    hint: "Inspect step payloads and artifact output, then retry from this step with corrected inputs.",
  };
}

function payloadPreview(value: unknown, maxLength = 1400): string {
  try {
    const serialized = JSON.stringify(value, null, 2);
    if (!serialized) {
      return "{}";
    }

    if (serialized.length <= maxLength) {
      return serialized;
    }

    return `${serialized.slice(0, maxLength)}\n...truncated`;
  } catch {
    return "[unserializable payload]";
  }
}

function isEmptyRecord(value: Record<string, unknown> | null): boolean {
  if (!value) {
    return true;
  }

  return Object.keys(value).length === 0;
}

function buildSafeFilename(name: string): string {
  const normalized = name
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "workflow-artifact";
}

export function RunTimeline({
  tenantId,
  run,
  steps,
  artifacts,
  workflowName,
}: RunTimelineProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<RunActionFeedback | null>(null);

  if (!run) {
    return (
      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Run Timeline
        </h4>
        <p className="mt-2 text-sm text-text-dim">
          Select a run to inspect step-by-step execution details.
        </p>
      </section>
    );
  }

  const activeRun = run;
  const runCanRetrySteps =
    activeRun.status === "failed" ||
    activeRun.status === "canceled" ||
    activeRun.status === "approval_rejected";
  const runCanRerun =
    activeRun.status === "succeeded" ||
    activeRun.status === "failed" ||
    activeRun.status === "canceled" ||
    activeRun.status === "approval_rejected";
  const rerunBusy = activeActionId === "run:rerun";
  const runErrorTaxonomy = classifyErrorMessage(activeRun.error_message);
  const runInApprovalQueue =
    activeRun.status === "awaiting_approval" ||
    activeRun.status === "paused_waiting_approval";

  function navigateToRun(runId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("run_id", runId);
    const query = params.toString();
    router.push(query.length > 0 ? `/settings/workflows/runs?${query}` : "/settings/workflows/runs");
  }

  async function handleRerun() {
    if (!runCanRerun || rerunBusy) {
      return;
    }

    const confirmed = window.confirm(
      "Queue a new run using this workflow's latest published version?"
    );
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setActiveActionId("run:rerun");

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${activeRun.workflow_id}/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trigger_type: "manual",
            input: activeRun.input_payload,
            metadata: {
              requested_from: "workflow_runs_ui_rerun",
              rerun_of_run_id: activeRun.id,
            },
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setFeedback({
          kind: "error",
          message:
            typeof payload.error === "string"
              ? payload.error
              : "Failed to queue workflow rerun.",
        });
        return;
      }

      const queuedRun = payload.run as { id?: unknown } | undefined;
      if (!queuedRun || typeof queuedRun.id !== "string") {
        setFeedback({
          kind: "error",
          message: "Rerun queued but response payload did not include a run ID.",
        });
        return;
      }

      setFeedback({
        kind: "success",
        message:
          typeof payload.message === "string"
            ? payload.message
            : "Rerun queued successfully.",
      });
      navigateToRun(queuedRun.id);
    } catch {
      setFeedback({
        kind: "error",
        message: "Failed to queue workflow rerun.",
      });
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleRetryStep(step: WorkflowRunStep) {
    if (!runCanRetrySteps) {
      return;
    }

    const retryable = step.status === "failed" || step.status === "canceled";
    if (!retryable) {
      return;
    }

    const actionId = `step:${step.id}:retry`;
    if (activeActionId === actionId) {
      return;
    }

    const confirmed = window.confirm(
      `Retry from step ${step.step_index} (${step.node_id}) in a new run?`
    );
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setActiveActionId(actionId);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflow-runs/${activeRun.id}/retry-step`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step_id: step.id,
            reason: "Requested from workflow run timeline UI",
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setFeedback({
          kind: "error",
          message:
            typeof payload.error === "string"
              ? payload.error
              : "Failed to queue retry run.",
        });
        return;
      }

      const retryRun = payload.run as { id?: unknown } | undefined;
      if (!retryRun || typeof retryRun.id !== "string") {
        setFeedback({
          kind: "error",
          message:
            "Retry queued but response payload did not include the retry run ID.",
        });
        return;
      }

      setFeedback({
        kind: "success",
        message:
          typeof payload.message === "string"
            ? payload.message
            : `Retry queued from step ${step.step_index}.`,
      });
      navigateToRun(retryRun.id);
    } catch {
      setFeedback({
        kind: "error",
        message: "Failed to queue retry run.",
      });
    } finally {
      setActiveActionId(null);
    }
  }

  function handleExportArtifactPayload(artifact: WorkflowRunArtifact) {
    const payloadJson = JSON.stringify(artifact.payload ?? {}, null, 2);
    const blob = new Blob([payloadJson], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${buildSafeFilename(artifact.name)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  const sortedSteps = [...steps].sort((a, b) => {
    if (a.step_index !== b.step_index) {
      return a.step_index - b.step_index;
    }

    return a.attempt - b.attempt;
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-headline text-sm font-semibold text-text-primary">
              {workflowName || "Workflow"} run
            </h4>
            <p className="mt-1 text-xs text-text-dim">Run ID: {activeRun.id}</p>
          </div>
          <StatusBadge status={activeRun.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleRerun();
            }}
            disabled={!runCanRerun || rerunBusy}
            title={
              runCanRerun
                ? "Queue a new run from the latest published workflow version."
                : "Rerun is available only after a run completes."
            }
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            {rerunBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Rerun workflow
          </button>
          {(runInApprovalQueue || activeRun.status === "approval_rejected") && (
            <Link
              href={`/settings/workflows/approvals?workflow_id=${activeRun.workflow_id}&run_id=${activeRun.id}`}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
            >
              Open approval inbox
            </Link>
          )}
        </div>

        {feedback && (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
              feedback.kind === "error"
                ? "border-destructive/30 bg-destructive/10 text-red-200"
                : "border-green-500/30 bg-green-500/10 text-green-200"
            }`}
            role="status"
          >
            {feedback.message}
          </p>
        )}

        <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2 xl:grid-cols-4">
          <p>Trigger: {activeRun.trigger_type}</p>
          <p>Version: v{activeRun.source_version}</p>
          <p>Started: {formatTimestamp(activeRun.started_at)}</p>
          <p>Duration: {formatDuration(activeRun.started_at, activeRun.completed_at)}</p>
        </div>

        {activeRun.error_message && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-200">
            <p>{activeRun.error_message}</p>
            {runErrorTaxonomy && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-red-100">
                  Error category: {runErrorTaxonomy.label}
                </p>
                <p className="text-red-100/90">{runErrorTaxonomy.hint}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Steps ({sortedSteps.length})
        </h4>
        {sortedSteps.length === 0 ? (
          <p className="mt-2 text-sm text-text-dim">
            No step events recorded yet for this run.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {sortedSteps.map((step) => {
              const stepErrorTaxonomy = classifyErrorMessage(step.error_message);

              return (
                <article key={step.id} className="rounded-xl border border-border bg-bg-dark/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-text-primary">
                      Step {step.step_index} | {step.node_type} ({step.node_id}) | Attempt{" "}
                      {step.attempt}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium ${stepStatusTone(step.status)}`}>
                        {step.status}
                      </p>

                      {runCanRetrySteps && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleRetryStep(step);
                          }}
                          disabled={
                            activeActionId === `step:${step.id}:retry` ||
                            (step.status !== "failed" && step.status !== "canceled")
                          }
                          title={
                            step.status === "failed" || step.status === "canceled"
                              ? `Retry from step ${step.step_index}`
                              : "Retry available only for failed/canceled steps."
                          }
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {activeActionId === `step:${step.id}:retry` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Undo2 className="h-3.5 w-3.5" />
                          )}
                          Retry from here
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 text-xs text-text-dim sm:grid-cols-2">
                    <p>Started: {formatTimestamp(step.started_at)}</p>
                    <p>Completed: {formatTimestamp(step.completed_at)}</p>
                  </div>

                  {step.error_message && (
                    <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-red-200">
                      <p>{step.error_message}</p>
                      {stepErrorTaxonomy && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] uppercase tracking-wide text-red-100">
                            Error category: {stepErrorTaxonomy.label}
                          </p>
                          <p className="text-red-100/90">{stepErrorTaxonomy.hint}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {(!isEmptyRecord(step.input_payload) || step.output_payload) && (
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      {!isEmptyRecord(step.input_payload) && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-text-dim">
                            Input
                          </p>
                          <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-bg-dark px-2.5 py-2 text-[11px] text-text-secondary">
                            {payloadPreview(step.input_payload)}
                          </pre>
                        </div>
                      )}
                      {step.output_payload && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-text-dim">
                            Output
                          </p>
                          <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-bg-dark px-2.5 py-2 text-[11px] text-text-secondary">
                            {payloadPreview(step.output_payload)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Artifacts ({artifacts.length})
        </h4>
        {artifacts.length === 0 ? (
          <p className="mt-2 text-sm text-text-dim">No artifacts recorded for this run.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="rounded-lg border border-border bg-bg-dark/50 px-3 py-2 text-xs text-text-secondary"
              >
                <p className="font-medium text-text-primary">
                  {artifact.name} ({artifact.artifact_type})
                </p>
                <p className="mt-1 text-text-dim">
                  Step: {artifact.step_id || "run-level"} | {formatTimestamp(artifact.created_at)}
                </p>
                {(artifact.storage_bucket || artifact.storage_path) && (
                  <p className="mt-1 text-text-dim">
                    Storage: {artifact.storage_bucket || "bucket?"}/
                    {artifact.storage_path || "path?"}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {artifact.storage_bucket && artifact.storage_path ? (
                    <a
                      href={`/api/tenants/${tenantId}/workflow-runs/${activeRun.id}/artifacts/${artifact.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                    >
                      Download artifact
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleExportArtifactPayload(artifact)}
                      className="inline-flex min-h-11 items-center rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                    >
                      Export payload JSON
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
