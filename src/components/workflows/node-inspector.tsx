"use client";

import { memo } from "react";
import type { WorkflowNode } from "@/types/workflow";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Trash2 } from "lucide-react";

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card";
const INPUT_CLASS = `w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary ${FOCUS_RING_CLASS}`;
const SECONDARY_BUTTON_CLASS = `min-h-11 rounded-md border border-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`;
const DANGER_BUTTON_CLASS = `min-h-11 rounded-md border border-destructive/30 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-destructive/10 ${FOCUS_RING_CLASS}`;

function getConfigString(node: WorkflowNode, key: string): string {
  const value = node.config[key];
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function getConfigNumber(node: WorkflowNode, key: string, fallback: number): number {
  const value = node.config[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getConfigBoolean(node: WorkflowNode, key: string, fallback: boolean): boolean {
  const value = node.config[key];
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

  return fallback;
}

interface NodeInspectorProps {
  node: WorkflowNode | null;
  onUpdateNode: (node: WorkflowNode, label: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodeInspector = memo(
  function NodeInspector({
    node,
    onUpdateNode,
    onDuplicateNode,
    onDeleteNode,
  }: NodeInspectorProps) {
    if (!node) {
      return (
        <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
          <h4 className="font-headline text-sm font-semibold text-text-primary">Inspector</h4>
          <p className="mt-2 text-xs text-text-dim">
            Select a node on canvas to edit configuration.
          </p>
        </section>
      );
    }

    const fieldId = (field: string) => `node-inspector-${node.id}-${field}`;

    const updateConfigField = (key: string, value: unknown, actionLabel: string) => {
      onUpdateNode(
        {
          ...node,
          config: {
            ...node.config,
            [key]: value,
          },
        },
        actionLabel
      );
    };

    return (
      <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h4 className="font-headline text-sm font-semibold text-text-primary">Inspector</h4>
            <p className="mt-1 text-xs text-text-dim">{node.id}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDuplicateNode(node.id)}
              className={SECONDARY_BUTTON_CLASS}
            >
              <Copy className="mr-1 inline h-3.5 w-3.5" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onDeleteNode(node.id)}
              className={DANGER_BUTTON_CLASS}
            >
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor={fieldId("label")}
              className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
            >
              Label
            </label>
            <input
              id={fieldId("label")}
              value={node.label}
              onChange={(event) =>
                onUpdateNode(
                  {
                    ...node,
                    label: event.target.value,
                  },
                  `Rename ${node.id}`
                )
              }
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor={fieldId("position-x")}
                className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
              >
                X
              </label>
              <input
                id={fieldId("position-x")}
                type="number"
                value={Math.round(node.position.x)}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }

                  onUpdateNode(
                    {
                      ...node,
                      position: {
                        ...node.position,
                        x: parsed,
                      },
                    },
                    `Move ${node.id}`
                  );
                }}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor={fieldId("position-y")}
                className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
              >
                Y
              </label>
              <input
                id={fieldId("position-y")}
                type="number"
                value={Math.round(node.position.y)}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }

                  onUpdateNode(
                    {
                      ...node,
                      position: {
                        ...node.position,
                        y: parsed,
                      },
                    },
                    `Move ${node.id}`
                  );
                }}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {node.type === "trigger" && (
            <>
              <div>
                <label
                  htmlFor={fieldId("trigger-kind")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Trigger Kind
                </label>
                <select
                  id={fieldId("trigger-kind")}
                  value={getConfigString(node, "trigger_kind") || "manual"}
                  onChange={(event) =>
                    updateConfigField("trigger_kind", event.target.value, `Update ${node.id} trigger`)
                  }
                  className={INPUT_CLASS}
                >
                  <option value="manual">manual</option>
                  <option value="schedule">schedule</option>
                  <option value="webhook">webhook</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={fieldId("trigger-cron")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Cron
                </label>
                <input
                  id={fieldId("trigger-cron")}
                  value={getConfigString(node, "cron")}
                  onChange={(event) =>
                    updateConfigField("cron", event.target.value, `Update ${node.id} cron`)
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor={fieldId("trigger-timezone")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Timezone
                </label>
                <input
                  id={fieldId("trigger-timezone")}
                  value={getConfigString(node, "timezone")}
                  onChange={(event) =>
                    updateConfigField(
                      "timezone",
                      event.target.value,
                      `Update ${node.id} timezone`
                    )
                  }
                  className={INPUT_CLASS}
                />
              </div>
            </>
          )}

          {node.type === "action" && (
            <>
              <div>
                <label
                  htmlFor={fieldId("action-key")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Action Key
                </label>
                <input
                  id={fieldId("action-key")}
                  value={getConfigString(node, "action_key")}
                  onChange={(event) =>
                    updateConfigField("action_key", event.target.value, `Update ${node.id} action`)
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor={fieldId("action-prompt-template")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Prompt Template
                </label>
                <Textarea
                  id={fieldId("action-prompt-template")}
                  rows={4}
                  value={getConfigString(node, "prompt_template")}
                  onChange={(event) =>
                    updateConfigField(
                      "prompt_template",
                      event.target.value,
                      `Update ${node.id} prompt`
                    )
                  }
                  className={INPUT_CLASS}
                />
              </div>
            </>
          )}

          {node.type === "approval" && (
            <>
              <div>
                <label
                  htmlFor={fieldId("approval-reviewer-group")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Reviewer Group
                </label>
                <input
                  id={fieldId("approval-reviewer-group")}
                  value={getConfigString(node, "reviewer_group")}
                  onChange={(event) =>
                    updateConfigField(
                      "reviewer_group",
                      event.target.value,
                      `Update ${node.id} reviewer group`
                    )
                  }
                  placeholder="ops-team"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor={fieldId("approval-reviewer-role")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Reviewer Role
                </label>
                <input
                  id={fieldId("approval-reviewer-role")}
                  value={getConfigString(node, "reviewer_role")}
                  onChange={(event) =>
                    updateConfigField(
                      "reviewer_role",
                      event.target.value,
                      `Update ${node.id} reviewer role`
                    )
                  }
                  placeholder="manager"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor={fieldId("approval-sla-minutes")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  SLA Minutes
                </label>
                <input
                  id={fieldId("approval-sla-minutes")}
                  type="number"
                  min={1}
                  step={1}
                  value={getConfigNumber(node, "sla_minutes", 120)}
                  onChange={(event) =>
                    updateConfigField("sla_minutes", Number(event.target.value), `Update ${node.id} SLA`)
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor={fieldId("approval-instructions")}
                  className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
                >
                  Instructions
                </label>
                <Textarea
                  id={fieldId("approval-instructions")}
                  rows={4}
                  value={getConfigString(node, "instructions")}
                  onChange={(event) =>
                    updateConfigField(
                      "instructions",
                      event.target.value,
                      `Update ${node.id} instructions`
                    )
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <Checkbox
                id={fieldId("approval-reject-comment")}
                label="Require comment on reject"
                checked={getConfigBoolean(node, "require_comment_on_reject", true)}
                onChange={(event) =>
                  updateConfigField(
                    "require_comment_on_reject",
                    event.currentTarget.checked,
                    `Update ${node.id} reject comment policy`
                  )
                }
              />
            </>
          )}

          {node.type === "condition" && (
            <div>
              <label
                htmlFor={fieldId("condition-expression")}
                className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
              >
                Expression
              </label>
              <Textarea
                id={fieldId("condition-expression")}
                rows={4}
                value={getConfigString(node, "expression")}
                onChange={(event) =>
                  updateConfigField("expression", event.target.value, `Update ${node.id} expression`)
                }
                className={INPUT_CLASS}
              />
            </div>
          )}

          {node.type === "delay" && (
            <div>
              <label
                htmlFor={fieldId("delay-seconds")}
                className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
              >
                Delay Seconds
              </label>
              <input
                id={fieldId("delay-seconds")}
                type="number"
                min={0}
                value={getConfigNumber(node, "delay_seconds", 60)}
                onChange={(event) =>
                  updateConfigField("delay_seconds", Number(event.target.value), `Update ${node.id} delay`)
                }
                className={INPUT_CLASS}
              />
            </div>
          )}

          {node.type === "handoff" && (
            <div>
              <label
                htmlFor={fieldId("handoff-agent-key")}
                className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
              >
                Handoff Agent Key
              </label>
              <input
                id={fieldId("handoff-agent-key")}
                value={getConfigString(node, "handoff_agent_key")}
                onChange={(event) =>
                  updateConfigField(
                    "handoff_agent_key",
                    event.target.value,
                    `Update ${node.id} handoff`
                  )
                }
                className={INPUT_CLASS}
              />
            </div>
          )}

          {node.type === "end" && (
            <div>
              <label
                htmlFor={fieldId("end-summary")}
                className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
              >
                Summary
              </label>
              <input
                id={fieldId("end-summary")}
                value={getConfigString(node, "summary")}
                onChange={(event) =>
                  updateConfigField("summary", event.target.value, `Update ${node.id} summary`)
                }
                className={INPUT_CLASS}
              />
            </div>
          )}
        </div>
      </section>
    );
  },
  (previous, next) => previous.node === next.node
);

NodeInspector.displayName = "NodeInspector";
