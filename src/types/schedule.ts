export type ScheduleType = "predefined" | "custom" | "briefing";
export type ScheduleCreatedBy = "dashboard" | "discord_chat" | "system";

export interface TenantSchedule {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string;
  channel_id: string;
  schedule_key: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  metadata: Record<string, unknown>;
  schedule_type: ScheduleType;
  display_name: string | null;
  prompt: string | null;
  tools: string[];
  created_by: ScheduleCreatedBy;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomScheduleInput {
  display_name: string;
  prompt: string;
  cron_expression: string;
  timezone: string;
  agent_id: string;
  channel_id: string;
  tools?: string[];
}

export interface UpdateCustomScheduleInput {
  display_name?: string;
  prompt?: string;
  cron_expression?: string;
  timezone?: string;
  tools?: string[];
  enabled?: boolean;
}
