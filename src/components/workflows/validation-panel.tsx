"use client";

import { memo } from "react";
import type { WorkflowValidationError } from "@/types/workflow";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface ValidationPanelProps {
  errors: WorkflowValidationError[];
  onFocusNode: (nodeId: string) => void;
}

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card";

export const ValidationPanel = memo(
  function ValidationPanel({ errors, onFocusNode }: ValidationPanelProps) {
    const hasErrors = errors.length > 0;

    return (
      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="font-headline text-sm font-semibold text-text-primary">
            Validation
          </h4>
          {hasErrors ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errors.length} issue{errors.length === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Valid
            </span>
          )}
        </div>

        {!hasErrors ? (
          <p className="text-xs text-text-dim">
            Graph structure passes local validation checks.
          </p>
        ) : (
          <div className="space-y-2" role="alert" aria-live="assertive" aria-atomic="true">
            {errors.map((error, index) => (
              <div
                key={`${error.code}-${error.node_id || "none"}-${error.edge_id || "none"}-${index}`}
                className="rounded-lg border border-red-400/40 bg-red-500/15 p-2.5"
              >
                <p className="text-xs font-semibold text-red-100">{error.code}</p>
                <p className="mt-1 text-xs text-red-100">{error.message}</p>
                {error.node_id && (
                  <button
                    type="button"
                    onClick={() => onFocusNode(error.node_id as string)}
                    className={`mt-2 min-h-11 rounded border border-red-400/40 px-3 py-2 text-[11px] text-red-100 transition-colors hover:bg-red-500/15 ${FOCUS_RING_CLASS}`}
                  >
                    Focus node {error.node_id}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  },
  (previous, next) => previous.errors === next.errors
);

ValidationPanel.displayName = "ValidationPanel";
