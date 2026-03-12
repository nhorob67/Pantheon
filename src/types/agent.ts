export type ToolApprovalLevel = "auto" | "confirm" | "disabled";
export type AutonomyLevel = "assisted" | "copilot" | "autopilot";

export interface Agent {
  id: string;
  instance_id: string;
  customer_id: string;
  agent_key: string;
  display_name: string;
  role: string;
  goal: string | null;
  backstory: string | null;
  autonomy_level: AutonomyLevel;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  is_default: boolean;
  skills: string[];
  /** @deprecated Schedules are managed via tenant_scheduled_messages. Always `{}` for new agents. */
  cron_jobs?: Record<string, boolean>;
  composio_toolkits?: string[];
  can_delegate?: boolean;
  can_receive_delegation?: boolean;
  tool_approval_overrides?: Record<string, ToolApprovalLevel>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const AUTONOMY_LEVELS = ["assisted", "copilot", "autopilot"] as const;

export const AUTONOMY_LEVEL_INFO: Record<
  AutonomyLevel,
  { label: string; description: string }
> = {
  assisted: {
    label: "Assisted",
    description: "Asks before taking any action",
  },
  copilot: {
    label: "Copilot",
    description: "Suggests actions, acts on read-only ops",
  },
  autopilot: {
    label: "Autopilot",
    description: "Acts independently based on its goal",
  },
};

export interface AutonomyOption {
  value: AutonomyLevel;
  label: string;
  tag: string;
  desc: string;
}

export const AUTONOMY_OPTIONS: AutonomyOption[] = [
  { value: "assisted", label: "Assisted", tag: "L1", desc: "Asks before acting" },
  { value: "copilot", label: "Copilot", tag: "L2", desc: "Suggests then acts" },
  { value: "autopilot", label: "Autopilot", tag: "L3", desc: "Acts on its own" },
];

export function toAutonomyLevel(value: unknown): AutonomyLevel {
  if (
    typeof value === "string" &&
    (value === "assisted" || value === "copilot" || value === "autopilot")
  ) {
    return value;
  }
  return "copilot";
}

