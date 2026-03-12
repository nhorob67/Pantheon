"use client";

import type { ToolApprovalLevel } from "@/types/agent";
import { ChevronDown } from "lucide-react";

const TOOL_DISPLAY_INFO: Record<string, { label: string; description: string }> = {
  tenant_memory_search: { label: "Search Memory", description: "Search memory records" },
  tenant_memory_write: { label: "Write Memory", description: "Save facts and preferences to memory" },
  schedule_create: { label: "Create Schedule", description: "Create a recurring scheduled task" },
  schedule_list: { label: "List Schedules", description: "List all scheduled tasks" },
  schedule_toggle: { label: "Toggle Schedule", description: "Enable or disable a schedule" },
  schedule_delete: { label: "Delete Schedule", description: "Delete a custom schedule" },
};

const SKILL_TOOLS: Record<string, string[]> = {};

const ALWAYS_AVAILABLE_TOOLS = [
  "tenant_memory_search",
  "tenant_memory_write",
  "schedule_create",
  "schedule_list",
  "schedule_toggle",
  "schedule_delete",
];

interface ToolControlsProps {
  skills: string[];
  overrides: Record<string, ToolApprovalLevel>;
  onChangeLevel: (toolKey: string, level: ToolApprovalLevel) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export function ToolControls({
  skills,
  overrides,
  onChangeLevel,
  expanded,
  onToggleExpanded,
}: ToolControlsProps) {
  const availableTools: string[] = [];
  for (const skill of skills) {
    const tools = SKILL_TOOLS[skill];
    if (tools) {
      for (const t of tools) {
        if (!availableTools.includes(t)) availableTools.push(t);
      }
    }
  }
  for (const t of ALWAYS_AVAILABLE_TOOLS) {
    if (!availableTools.includes(t)) availableTools.push(t);
  }

  const nonAutoCount = Object.values(overrides).filter((v) => v !== "auto").length;

  return (
    <div>
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer w-full text-left"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
        />
        <span className="font-medium">Tool Controls</span>
        {!expanded && nonAutoCount > 0 && (
          <span className="text-xs text-accent ml-1">
            {nonAutoCount} override{nonAutoCount !== 1 ? "s" : ""}
          </span>
        )}
        {!expanded && nonAutoCount === 0 && (
          <span className="text-text-dim text-xs ml-1">
            — all tools on auto
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-text-dim mb-2">
            Control how each tool runs. &ldquo;Confirm&rdquo; makes the assistant ask permission first. &ldquo;Disabled&rdquo; removes the tool entirely.
          </p>
          {availableTools.map((toolKey) => {
            const info = TOOL_DISPLAY_INFO[toolKey];
            const level = overrides[toolKey] || "auto";
            return (
              <div
                key={toolKey}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {info?.label || toolKey}
                  </p>
                  {info?.description && (
                    <p className="text-xs text-text-dim">{info.description}</p>
                  )}
                </div>
                <select
                  value={level}
                  onChange={(e) =>
                    onChangeLevel(toolKey, e.target.value as ToolApprovalLevel)
                  }
                  className="text-xs bg-bg-dark border border-border rounded-md px-2 py-1.5 text-text-primary outline-none focus:border-accent shrink-0"
                >
                  <option value="auto">Auto</option>
                  <option value="confirm">Confirm</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
