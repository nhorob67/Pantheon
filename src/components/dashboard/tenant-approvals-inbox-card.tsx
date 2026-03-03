import Link from "next/link";

interface PendingApproval {
  id: string;
  approval_type: "tool" | "export" | "runtime" | "policy";
  required_role: string;
  created_at: string;
  request_payload: Record<string, unknown>;
}

interface TenantApprovalsInboxCardProps {
  pendingCount: number;
  pendingApprovals: PendingApproval[];
}

function formatDate(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return value;
  }
  return dt.toLocaleString();
}

export function TenantApprovalsInboxCard({
  pendingCount,
  pendingApprovals,
}: TenantApprovalsInboxCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-headline text-base font-semibold text-foreground">
            Approvals Inbox
          </h3>
          <p className="text-sm text-foreground/60 mt-1">
            Pending high-risk runtime actions that require tenant approval.
          </p>
          <p className="text-xs text-foreground/50 mt-2">
            Pending requests: <span className="font-mono">{pendingCount}</span>
          </p>
        </div>

        <Link
          href="/settings/approvals"
          className="inline-flex items-center justify-center border border-border hover:bg-muted text-foreground rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Open Inbox
        </Link>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="mt-4 space-y-2">
          {pendingApprovals.map((approval) => {
            const toolKey =
              typeof approval.request_payload?.tool_key === "string"
                ? approval.request_payload.tool_key
                : approval.approval_type;
            return (
              <div
                key={approval.id}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">{toolKey}</p>
                <p className="text-xs text-foreground/60">
                  Required role: {approval.required_role} · Created{" "}
                  {formatDate(approval.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
