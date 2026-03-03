"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "canceled";

interface ApprovalRecord {
  id: string;
  approval_type: string;
  status: ApprovalStatus;
  required_role: string;
  request_payload: Record<string, unknown>;
  created_at: string;
}

interface TenantApprovalsPanelProps {
  tenantId: string;
  initialApprovals: ApprovalRecord[];
  initialStatus: ApprovalStatus;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function TenantApprovalsPanel({
  tenantId,
  initialApprovals,
  initialStatus,
}: TenantApprovalsPanelProps) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(initialApprovals);
  const [status, setStatus] = useState<ApprovalStatus>(initialStatus);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const visible = useMemo(
    () => approvals.filter((approval) => approval.status === status),
    [approvals, status]
  );

  async function reload(nextStatus: ApprovalStatus) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/approvals?status=${nextStatus}`, {
        method: "GET",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || body?.error || "Failed to load approvals");
      }

      const rows = Array.isArray(body?.data?.approvals)
        ? body.data.approvals
        : Array.isArray(body?.approvals)
          ? body.approvals
          : [];

      setApprovals(rows);
      setStatus(nextStatus);
      router.refresh();
    } catch (error) {
      toast(
        `Failed to refresh approvals: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function decide(approvalId: string, decision: "approved" | "rejected") {
    setPendingId(approvalId);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/approvals/${approvalId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || body?.error || "Failed to submit decision");
      }

      setApprovals((current) =>
        current.map((approval) =>
          approval.id === approvalId
            ? {
              ...approval,
              status: decision,
            }
            : approval
        )
      );

      toast(decision === "approved" ? "Approval granted" : "Approval rejected", "success");
    } catch (error) {
      toast(
        `Failed to submit decision: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="approval-status" className="text-sm text-foreground/70">
          Status
        </label>
        <select
          id="approval-status"
          className="rounded-md border border-border bg-background px-3 py-1 text-sm"
          value={status}
          onChange={(event) => {
            void reload(event.target.value as ApprovalStatus);
          }}
          disabled={loading}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-foreground/60">No approvals for this status.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((approval) => {
            const toolKey =
              typeof approval.request_payload?.tool_key === "string"
                ? approval.request_payload.tool_key
                : "tool";
            return (
              <div key={approval.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{toolKey}</p>
                    <p className="text-xs text-foreground/60">
                      Required role: {approval.required_role} · Created {formatDate(approval.created_at)}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground/70">
                    {approval.status}
                  </span>
                </div>

                {status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300"
                      onClick={() => {
                        void decide(approval.id, "approved");
                      }}
                      disabled={pendingId === approval.id}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-500/40 px-3 py-1 text-xs text-red-300"
                      onClick={() => {
                        void decide(approval.id, "rejected");
                      }}
                      disabled={pendingId === approval.id}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
