export const TENANT_STATUS_VALUES = ["active", "paused", "archived"] as const;
export type TenantStatus = (typeof TENANT_STATUS_VALUES)[number];

export const TENANT_ROLE_VALUES = ["owner", "admin", "operator", "viewer"] as const;
export type TenantRole = (typeof TENANT_ROLE_VALUES)[number];

export const TENANT_MEMBER_STATUS_VALUES = [
  "invited",
  "active",
  "suspended",
] as const;
export type TenantMemberStatus = (typeof TENANT_MEMBER_STATUS_VALUES)[number];

export const TENANT_SESSION_KIND_VALUES = [
  "channel",
  "dm",
  "thread",
  "system",
] as const;
export type TenantSessionKind = (typeof TENANT_SESSION_KIND_VALUES)[number];

export const TENANT_SESSION_STATUS_VALUES = ["active", "idle", "closed"] as const;
export type TenantSessionStatus = (typeof TENANT_SESSION_STATUS_VALUES)[number];

export const TENANT_TOOL_STATUS_VALUES = ["enabled", "disabled", "shadow"] as const;
export type TenantToolStatus = (typeof TENANT_TOOL_STATUS_VALUES)[number];

export const TENANT_APPROVAL_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "canceled",
] as const;
export type TenantApprovalStatus = (typeof TENANT_APPROVAL_STATUS_VALUES)[number];

export interface Tenant {
  id: string;
  customer_id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  primary_channel_type: "discord";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantRoleDefinition {
  role_key: TenantRole;
  precedence: number;
  description: string;
  can_manage_members: boolean;
  can_manage_integrations: boolean;
  can_manage_tools: boolean;
  can_export_data: boolean;
  created_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  status: TenantMemberStatus;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  customer_id: string;
  integration_key: string;
  provider: string;
  status: "pending" | "active" | "disabled" | "error";
  external_ref: string | null;
  config: Record<string, unknown>;
  secret_ref: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantAgent {
  id: string;
  tenant_id: string;
  customer_id: string;
  legacy_agent_id: string | null;
  agent_key: string;
  display_name: string;
  status: "active" | "paused" | "archived";
  policy_profile: "safe" | "normal" | "unsafe";
  is_default: boolean;
  sort_order: number;
  skills: string[];
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantSession {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string | null;
  legacy_instance_id: string | null;
  session_kind: TenantSessionKind;
  external_id: string;
  peer_id: string | null;
  status: TenantSessionStatus;
  title: string | null;
  rolling_summary: string | null;
  summary_version: number;
  last_summarized_message_id: string | null;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantMessage {
  id: string;
  tenant_id: string;
  customer_id: string;
  session_id: string;
  direction: "inbound" | "outbound" | "system" | "tool";
  author_type: "user" | "agent" | "system" | "tool";
  author_id: string | null;
  content_text: string | null;
  content_json: Record<string, unknown>;
  citation_traces: unknown[];
  token_count: number | null;
  source_event_id: string | null;
  created_at: string;
}

export interface TenantTool {
  id: string;
  tenant_id: string;
  customer_id: string;
  tool_key: string;
  display_name: string;
  description: string | null;
  status: TenantToolStatus;
  risk_level: "low" | "medium" | "high" | "critical";
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantToolPolicy {
  id: string;
  tenant_id: string;
  customer_id: string;
  tool_id: string;
  approval_mode: "none" | "owner" | "admin" | "operator" | "always";
  allow_roles: TenantRole[];
  max_calls_per_hour: number;
  timeout_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantApproval {
  id: string;
  tenant_id: string;
  customer_id: string;
  approval_type: "tool" | "export" | "runtime" | "policy";
  status: TenantApprovalStatus;
  required_role: TenantRole;
  requested_by: string | null;
  decided_by: string | null;
  tool_id: string | null;
  request_hash: string | null;
  request_payload: Record<string, unknown>;
  decision_payload: Record<string, unknown>;
  expires_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantKnowledgeItem {
  id: string;
  tenant_id: string;
  customer_id: string;
  legacy_knowledge_file_id: string | null;
  title: string;
  source_type: "file" | "note" | "url" | "integration";
  mime_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  content_hash: string | null;
  status: "processing" | "active" | "archived" | "failed";
  metadata: Record<string, unknown>;
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMemoryRecord {
  id: string;
  tenant_id: string;
  customer_id: string;
  session_id: string | null;
  source_message_id: string | null;
  memory_tier: "working" | "episodic" | "knowledge";
  memory_type: "fact" | "preference" | "commitment" | "outcome" | "summary" | "other";
  content_text: string;
  content_json: Record<string, unknown>;
  confidence: number;
  source: "runtime" | "import" | "operator" | "system";
  superseded_by: string | null;
  is_tombstoned: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantExport {
  id: string;
  tenant_id: string;
  customer_id: string;
  requested_by: string | null;
  export_scope: "full" | "knowledge_only" | "metadata_only";
  format: "jsonl" | "csv";
  status: "queued" | "running" | "completed" | "failed" | "expired" | "canceled";
  include_blobs: boolean;
  manifest_path: string | null;
  file_count: number;
  total_size_bytes: number;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantExportFile {
  id: string;
  export_id: string;
  tenant_id: string;
  customer_id: string;
  file_name: string;
  file_type: string;
  storage_bucket: string;
  storage_path: string;
  checksum_sha256: string | null;
  size_bytes: number;
  created_at: string;
}

export interface TenantExportJob {
  id: string;
  export_id: string;
  tenant_id: string;
  customer_id: string;
  job_kind: "export" | "cleanup";
  status: "queued" | "running" | "completed" | "failed" | "canceled";
  attempt: number;
  worker_id: string | null;
  lock_expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InstanceTenantMapping {
  id: string;
  instance_id: string;
  tenant_id: string;
  customer_id: string;
  mapping_source: "backfill" | "manual" | "runtime";
  mapping_status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export const TENANT_RUNTIME_RUN_KIND_VALUES = [
  "discord_canary",
  "discord_runtime",
] as const;
export type TenantRuntimeRunKind = (typeof TENANT_RUNTIME_RUN_KIND_VALUES)[number];

export const TENANT_RUNTIME_RUN_STATUS_VALUES = [
  "queued",
  "running",
  "awaiting_approval",
  "completed",
  "failed",
  "canceled",
] as const;
export type TenantRuntimeRunStatus = (typeof TENANT_RUNTIME_RUN_STATUS_VALUES)[number];

export interface TenantRuntimeRun {
  id: string;
  tenant_id: string;
  customer_id: string;
  run_kind: TenantRuntimeRunKind;
  source: "discord_ingress" | "api" | "system";
  status: TenantRuntimeRunStatus;
  attempt_count: number;
  max_attempts: number;
  idempotency_key: string | null;
  request_trace_id: string | null;
  correlation_id: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  lock_expires_at: string | null;
  worker_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantToolInvocation {
  id: string;
  tenant_id: string;
  customer_id: string;
  run_id: string | null;
  tool_id: string | null;
  tool_key: string;
  requested_by: string | null;
  policy_decision: "allowed" | "denied" | "requires_approval";
  status: "pending" | "approved" | "rejected" | "completed" | "failed";
  request_payload: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  continuation_token: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
