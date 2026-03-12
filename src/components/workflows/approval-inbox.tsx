"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  formatWorkflowApprovalStatus,
  isWorkflowApprovalTerminalStatus,
  type WorkflowApprovalRecord,
} from "@/lib/workflows/approval-ui";
import { StatusBadge } from "@/components/ui/status-badge";

type DecisionAction = "approve" | "reject";

type DecisionFeedback = {
  kind: "success" | "error";
  message: string;
};

interface ApprovalInboxProps {
  tenantId: string;
  approval: WorkflowApprovalRecord | null;
  workflowName?: string | null;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function formatDurationFromMs(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function readBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return false;
}

interface SlaDescriptor {
  label: string;
  tone: string;
}

function describeSla(approval: WorkflowApprovalRecord | null): SlaDescriptor {
  if (!approval) {
    return {
      label: "SLA unavailable",
      tone: "text-text-dim",
    };
  }

  if (approval.dueAt) {
    const dueMs = Date.parse(approval.dueAt);
    if (!Number.isNaN(dueMs)) {
      const delta = dueMs - Date.now();
      if (delta < 0) {
        return {
          label: `Overdue by ${formatDurationFromMs(Math.abs(delta))}`,
          tone: "text-red-200",
        };
      }
      if (delta <= 60 * 60 * 1000) {
        return {
          label: `Due in ${formatDurationFromMs(delta)}`,
          tone: "text-amber-200",
        };
      }
      return {
        label: `Due in ${formatDurationFromMs(delta)}`,
        tone: "text-green-200",
      };
    }
  }

  if (approval.slaMinutes !== null) {
    return {
      label: `${approval.slaMinutes} minute SLA`,
      tone: "text-text-secondary",
    };
  }

  return {
    label: "No SLA set",
    tone: "text-text-dim",
  };
}

export function ApprovalInbox({
  tenantId,
  approval,
  workflowName,
}: ApprovalInboxProps) {
  const router = useRouter();
  const [decisionComment, setDecisionComment] = useState("");
  const [activeAction, setActiveAction] = useState<DecisionAction | null>(null);
  const [feedback, setFeedback] = useState<DecisionFeedback | null>(null);

  useEffect(() => {
    setDecisionComment("");
    setFeedback(null);
    setActiveAction(null);
  }, [approval?.id]);

  const terminal = approval ? isWorkflowApprovalTerminalStatus(approval.status) : true;
  const rejectCommentRequired =
    approval && readBoolean(approval.metadata.require_comment_on_reject);
  const slaDescriptor = useMemo(() => describeSla(approval), [approval]);

  async function submitDecision(action: DecisionAction) {
    if (!approval || terminal || activeAction) {
      return;
    }

    const comment = decisionComment.trim();
    if (action === "reject" && rejectCommentRequired && comment.length === 0) {
      setFeedback({
        kind: "error",
        message: "A comment is required before rejecting this approval.",
      });
      return;
    }

    setFeedback(null);
    setActiveAction(action);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflow-approvals/${approval.id}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(comment.length > 0 ? { comment } : {}),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setFeedback({
          kind: "error",
          message:
            typeof payload.error === "string"
              ? payload.error
              : `Failed to ${action} approval.`,
        });
        return;
      }

      setFeedback({
        kind: "success",
        message:
          typeof payload.message === "string"
            ? payload.message
            : action === "approve"
              ? "Approval marked as approved."
              : "Approval marked as rejected.",
      });
      setDecisionComment("");
      router.refresh();
    } catch {
      setFeedback({
        kind: "error",
        message: `Failed to ${action} approval.`,
      });
    } finally {
      setActiveAction(null);
    }
  }

  if (!approval) {
    return (
      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Approval Inbox
        </h4>
        <p className="mt-2 text-sm text-text-dim">
          Select an approval request to review instructions and take action.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-headline text-sm font-semibold text-text-primary">
            Approval Request
          </h4>
          <p className="mt-1 text-xs text-text-dim">Approval ID: {approval.id}</p>
        </div>
        <StatusBadge status={approval.status} />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
        <p>Workflow: {workflowName || approval.workflowId || "-"}</p>
        <p>
          Reviewer:{" "}
          {[approval.reviewerGroup, approval.reviewerRole].filter(Boolean).join(" / ") || "-"}
        </p>
        <p>Requested: {formatTimestamp(approval.requestedAt || approval.createdAt)}</p>
        <p>Due: {formatTimestamp(approval.dueAt)}</p>
        <p className={slaDescriptor.tone}>SLA: {slaDescriptor.label}</p>
        <p>
          Node: {approval.nodeLabel || approval.nodeId || "-"}
          {approval.runId ? ` | Run ${approval.runId}` : ""}
        </p>
      </div>

      {approval.instructions && (
        <div className="mt-3 rounded-lg border border-border bg-bg-dark/50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-text-dim">Instructions</p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-text-secondary">
            {approval.instructions}
          </p>
        </div>
      )}

      {approval.runId && approval.workflowId && (
        <Link
          href={`/settings/workflows/runs?workflow_id=${approval.workflowId}&run_id=${approval.runId}`}
          className="mt-3 inline-flex text-xs font-medium text-accent transition-colors hover:text-accent-light"
        >
          View related run timeline
        </Link>
      )}

      <div className="mt-3 space-y-2">
        <label
          htmlFor="approval-decision-comment"
          className="block text-[11px] uppercase tracking-wide text-text-dim"
        >
          Decision Comment
        </label>
        <Textarea
          id="approval-decision-comment"
          rows={4}
          value={decisionComment}
          onChange={(event) => setDecisionComment(event.target.value)}
          placeholder="Add context for this approval decision."
          disabled={terminal || activeAction !== null}
          className="w-full bg-bg-dark text-sm"
        />
      </div>

      {terminal && (
        <div className="mt-3 rounded-lg border border-border bg-bg-dark/50 px-3 py-2 text-xs text-text-secondary">
          <p>
            Decision complete: {formatWorkflowApprovalStatus(approval.status)}{" "}
            {approval.decidedAt ? `on ${formatTimestamp(approval.decidedAt)}` : ""}
          </p>
          {approval.decidedBy && <p className="mt-1">Reviewed by {approval.decidedBy}</p>}
          {approval.decisionComment && (
            <p className="mt-1 whitespace-pre-wrap text-text-dim">
              Comment: {approval.decisionComment}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void submitDecision("approve");
          }}
          disabled={terminal || activeAction !== null}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-green-500/35 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-200 transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {activeAction === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve
        </button>
        <button
          type="button"
          onClick={() => {
            void submitDecision("reject");
          }}
          disabled={terminal || activeAction !== null}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs font-medium text-red-200 transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {activeAction === "reject" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Reject
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            feedback.kind === "error"
              ? "border-destructive/30 bg-destructive/10 text-red-200"
              : "border-green-500/30 bg-green-500/10 text-green-200"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
}
