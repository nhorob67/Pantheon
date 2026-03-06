export interface Customer {
  id: string;
  user_id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "active" | "past_due" | "canceled" | "incomplete";
  plan: string;
  spending_cap_cents: number | null;
  spending_cap_auto_pause: boolean;
  stripe_metered_item_id: string | null;
  spending_paused_at: string | null;
  alert_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface FarmProfile {
  id: string;
  customer_id: string;
  farm_name: string | null;
  state: string;
  county: string | null;
  primary_crops: string[];
  acres: number | null;
  elevators: string[];
  elevator_urls: ElevatorEntry[];
  weather_location: string | null;
  weather_lat: number | null;
  weather_lng: number | null;
  timezone: string;
  soil_ph: number | null;
  soil_cec: number | null;
  organic_matter_pct: number | null;
  avg_annual_rainfall_in: number | null;
  created_at: string;
  updated_at: string;
}

export interface ElevatorEntry {
  name: string;
  url: string;
  crops: string[];
}

export interface Instance {
  id: string;
  customer_id: string;
  status: "provisioning" | "active" | "paused" | "error";
  channel_type: "discord";
  channel_config: Record<string, unknown>;
  webhook_secret_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiUsage {
  id: string;
  customer_id: string;
  instance_id: string | null;
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_cents: number;
  created_at: string;
}

export interface SkillConfig {
  id: string;
  customer_id: string;
  skill_name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface EmailIdentity {
  id: string;
  customer_id: string;
  instance_id: string | null;
  provider: string | null;
  provider_mailbox_id: string | null;
  provider_metadata: Record<string, unknown>;
  slug: string;
  address: string;
  sender_alias: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailInbound {
  id: string;
  customer_id: string;
  instance_id: string | null;
  identity_id: string | null;
  provider: string;
  provider_email_id: string;
  provider_event_id: string;
  from_email: string | null;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  message_id: string | null;
  cc: string[];
  bcc: string[];
  attachment_count: number;
  status: "queued" | "processing" | "processed" | "failed";
  retry_count: number;
  next_attempt_at: string;
  processing_started_at: string | null;
  processed_at: string | null;
  failed_at: string | null;
  last_error: string | null;
  raw_storage_bucket: string | null;
  raw_storage_path: string | null;
  metadata: Record<string, unknown>;
  received_at: string;
  created_at: string;
  updated_at: string;
}

export interface EmailInboundAttachment {
  id: string;
  inbound_id: string;
  customer_id: string;
  instance_id: string | null;
  provider: string;
  provider_attachment_id: string | null;
  filename: string;
  mime_type: string | null;
  size_bytes: number;
  sha256: string;
  storage_bucket: string;
  storage_path: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDefinitionRow {
  id: string;
  instance_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  tags: string[];
  owner_id: string | null;
  status: string;
  draft_graph: unknown;
  draft_version: number;
  published_version: number | null;
  is_valid: boolean;
  last_validation_errors: unknown;
  last_validated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowVersionRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  version: number;
  source: string;
  graph: unknown;
  compiled_ir: unknown;
  validation_errors: unknown;
  created_by: string | null;
  created_at: string;
}

export interface WorkflowNodeRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  draft_version: number;
  node_index: number;
  node_id: string;
  node_type: string;
  label: string | null;
  position_x: number | null;
  position_y: number | null;
  config: unknown;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEdgeRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  draft_version: number;
  edge_index: number;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_when: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  trigger_type: string;
  status: string;
  source_version: number;
  retry_of_run_id: string | null;
  requested_by: string | null;
  runtime_correlation_id: string | null;
  input_payload: unknown;
  output_payload: unknown;
  error_message: string | null;
  metadata: unknown;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunStepRow {
  id: string;
  run_id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  node_id: string;
  node_type: string;
  step_index: number;
  attempt: number;
  status: string;
  input_payload: unknown;
  output_payload: unknown;
  error_message: string | null;
  metadata: unknown;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunArtifactRow {
  id: string;
  run_id: string;
  step_id: string | null;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  artifact_type: string;
  name: string;
  mime_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  payload: unknown;
  metadata: unknown;
  created_at: string;
}

export interface WorkflowApprovalRow {
  id: string;
  run_id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  node_id: string;
  node_label: string | null;
  status: string;
  sla_due_at: string | null;
  decision_comment: string | null;
  decision_actor_id: string | null;
  decided_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  canceled_at: string | null;
  expired_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateRow {
  id: string;
  instance_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  template_kind: string;
  latest_version: number;
  latest_graph: unknown;
  metadata: unknown;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateVersionRow {
  id: string;
  template_id: string;
  instance_id: string;
  customer_id: string;
  version: number;
  graph: unknown;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
}

export interface WorkflowEnvironmentVersionRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  environment: string;
  version: number;
  source_environment: string | null;
  promotion_note: string | null;
  metadata: unknown;
  promoted_by: string | null;
  promoted_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEnvironmentPromotionEventRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  from_environment: string | null;
  to_environment: string;
  version: number;
  promotion_note: string | null;
  metadata: unknown;
  promoted_by: string | null;
  created_at: string;
}

export interface WorkflowPlaybookRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  tags: string[];
  visibility: string;
  status: string;
  source_workflow_id: string | null;
  source_instance_id: string | null;
  customer_id: string | null;
  latest_version: number;
  latest_graph: unknown;
  metadata: unknown;
  install_count: number;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowPlaybookVersionRow {
  id: string;
  playbook_id: string;
  version: number;
  graph: unknown;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
}

export interface WorkflowPlaybookInstallRow {
  id: string;
  playbook_id: string;
  playbook_version: number;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  installed_by: string | null;
  metadata: unknown;
  installed_at: string;
}

export interface WorkflowLaunchReadinessSnapshotRow {
  id: string;
  customer_id: string;
  instance_id: string;
  timeframe_days: number;
  min_samples_per_metric: number;
  capture_source: string;
  performance_overall_status: string;
  rollout_assigned_ring: string;
  rollout_target_ring: string;
  release_open_for_customer: boolean;
  snapshot: unknown;
  generated_at: string;
  created_at: string;
}

export type {
  AlertEvent,
  AlertPreferences,
  SpendingStatus,
  ConversationEvent,
} from "./alerts";
export type { Agent, PersonalityPreset } from "./agent";
export type { McpServerConfig } from "./mcp";
export type {
  TenantMemorySettings,
  MemoryMode,
  MemoryCaptureLevel,
  MemoryOperation,
  MemoryOperationType,
  MemoryOperationStatus,
} from "./memory";
export type {
  WorkflowStatus,
  WorkflowRunStatus,
  WorkflowApprovalStatus,
  WorkflowRunTriggerType,
  WorkflowRunStepStatus,
  WorkflowVersionSource,
  WorkflowTemplateKind,
  WorkflowEnvironment,
  WorkflowPlaybookStatus,
  WorkflowPlaybookVisibility,
  WorkflowNodeType,
  WorkflowEdgeCondition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowDefinition,
  WorkflowVersion,
  WorkflowTemplate,
  WorkflowTemplateVersion,
  WorkflowEnvironmentVersion,
  WorkflowEnvironmentPromotionEvent,
  WorkflowPlaybook,
  WorkflowPlaybookVersion,
  WorkflowPlaybookInstall,
  WorkflowRun,
  WorkflowRunStep,
  WorkflowApproval,
  WorkflowRunArtifact,
  WorkflowValidationErrorCode,
  WorkflowValidationError,
  WorkflowValidationResult,
} from "./workflow";
export type {
  TenantStatus,
  TenantRole,
  TenantMemberStatus,
  TenantSessionKind,
  TenantSessionStatus,
  TenantToolStatus,
  TenantApprovalStatus,
  Tenant,
  TenantRoleDefinition,
  TenantMember,
  TenantIntegration,
  TenantAgent,
  TenantSession,
  TenantMessage,
  TenantTool,
  TenantToolPolicy,
  TenantApproval,
  TenantKnowledgeItem,
  TenantMemoryRecord,
  TenantExport,
  TenantExportFile,
  TenantExportJob,
  InstanceTenantMapping,
  TenantRuntimeRunKind,
  TenantRuntimeRunStatus,
  TenantRuntimeRun,
} from "./tenant-runtime";
