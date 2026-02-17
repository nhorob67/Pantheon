"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card";

interface WorkflowStatusToggleProps {
  instanceId: string;
  workflowId: string;
  workflowName: string;
  isArchived: boolean;
}

export function WorkflowStatusToggle({
  instanceId,
  workflowId,
  workflowName,
  isArchived,
}: WorkflowStatusToggleProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const busy = isSubmitting || isPending;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setError(null);

          const confirmationMessage = isArchived
            ? `Restore \"${workflowName}\" from archive?`
            : `Archive \"${workflowName}\"? Runs cannot be queued while archived.`;

          if (!window.confirm(confirmationMessage)) {
            return;
          }

          setIsSubmitting(true);
          try {
            const response = await fetch(
              `/api/instances/${instanceId}/workflows/${workflowId}/status`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  archived: !isArchived,
                  reason: "Requested from workflow list",
                }),
              }
            );

            const payload = (await response
              .json()
              .catch(() => ({}))) as Record<string, unknown>;

            if (!response.ok) {
              setError(
                typeof payload.error === "string"
                  ? payload.error
                  : "Failed to update workflow status."
              );
              return;
            }

            startTransition(() => {
              router.refresh();
            });
          } catch {
            setError("Failed to update workflow status.");
          } finally {
            setIsSubmitting(false);
          }
        }}
        className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING_CLASS}`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
        ) : isArchived ? (
          <ArchiveRestore className="h-3.5 w-3.5" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
        {isArchived ? "Unarchive" : "Archive"}
      </button>
      {error && <p className="text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
