"use client";

import { memo, useCallback } from "react";
import type { ComponentType, DragEvent } from "react";
import type { WorkflowNodeType } from "@/types/workflow";
import {
  GitBranch,
  PlayCircle,
  Workflow,
  Clock3,
  ArrowRightLeft,
  Flag,
  UserCheck,
} from "lucide-react";

export const WORKFLOW_NODE_DRAG_MIME = "application/x-farmclaw-workflow-node-type";
const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card";

export interface WorkflowNodeTemplate {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  defaultConfig: Record<string, unknown>;
}

export const NODE_LIBRARY_TEMPLATES: WorkflowNodeTemplate[] = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Starts the workflow from schedule, webhook, or manual trigger.",
    icon: PlayCircle,
    defaultConfig: {
      trigger_kind: "manual",
      cron: "0 6 * * *",
      timezone: "America/Chicago",
    },
  },
  {
    type: "action",
    label: "Action",
    description: "Runs an agent or tool step with configurable input.",
    icon: Workflow,
    defaultConfig: {
      action_key: "",
      prompt_template: "",
    },
  },
  {
    type: "approval",
    label: "Approval",
    description: "Pauses execution until an assigned reviewer approves or rejects.",
    icon: UserCheck,
    defaultConfig: {
      reviewer_group: "farm-ops",
      reviewer_role: "manager",
      sla_minutes: 120,
      instructions:
        "Review the request details and attached outputs before making a decision.",
      require_comment_on_reject: true,
    },
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branches flow into true/false paths using an expression.",
    icon: GitBranch,
    defaultConfig: {
      expression: "",
    },
  },
  {
    type: "delay",
    label: "Delay",
    description: "Pauses execution before continuing to next node.",
    icon: Clock3,
    defaultConfig: {
      delay_seconds: 60,
    },
  },
  {
    type: "handoff",
    label: "Handoff",
    description: "Transfers control to another specialist agent.",
    icon: ArrowRightLeft,
    defaultConfig: {
      handoff_agent_key: "",
    },
  },
  {
    type: "end",
    label: "End",
    description: "Stops workflow execution and closes the branch.",
    icon: Flag,
    defaultConfig: {
      summary: "",
    },
  },
];

interface NodeLibraryProps {
  onInsertNode: (template: WorkflowNodeTemplate) => void;
}

export const NodeLibrary = memo(function NodeLibrary({ onInsertNode }: NodeLibraryProps) {
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, type: WorkflowNodeType) => {
      event.dataTransfer.setData(WORKFLOW_NODE_DRAG_MIME, type);
      event.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  return (
    <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
      <div className="mb-3">
        <h4 className="font-headline text-sm font-semibold text-text-primary">
          Node Library
        </h4>
        <p className="mt-1 text-xs text-text-dim">
          Drag onto canvas or click Add.
        </p>
      </div>

      <div className="space-y-2">
        {NODE_LIBRARY_TEMPLATES.map((template) => (
          <div
            key={template.type}
            draggable
            onDragStart={(event) => handleDragStart(event, template.type)}
            className="rounded-xl border border-border bg-bg-dark/60 p-3 transition-colors hover:border-border-light"
            role="group"
            aria-label={`${template.label} node template`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                  <template.icon className="h-4 w-4 text-accent" />
                  {template.label}
                </p>
                <p className="mt-1 text-xs text-text-dim">{template.description}</p>
              </div>

              <button
                type="button"
                onClick={() => onInsertNode(template)}
                className={`min-h-11 rounded-md border border-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

NodeLibrary.displayName = "NodeLibrary";
