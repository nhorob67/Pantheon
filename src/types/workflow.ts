export const WORKFLOW_STATUSES = ["draft", "published", "archived"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_RUN_STATUSES = [
  "queued",
  "awaiting_approval",
  "paused_waiting_approval",
  "running",
  "succeeded",
  "failed",
  "approval_rejected",
  "cancel_requested",
  "canceled",
] as const;
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];

export const WORKFLOW_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "canceled",
  "expired",
] as const;
export type WorkflowApprovalStatus = (typeof WORKFLOW_APPROVAL_STATUSES)[number];

export const WORKFLOW_RUN_TRIGGER_TYPES = [
  "manual",
  "schedule",
  "event",
  "retry",
  "system",
] as const;
export type WorkflowRunTriggerType = (typeof WORKFLOW_RUN_TRIGGER_TYPES)[number];

export const WORKFLOW_RUN_STEP_STATUSES = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "canceled",
] as const;
export type WorkflowRunStepStatus = (typeof WORKFLOW_RUN_STEP_STATUSES)[number];

export const WORKFLOW_VERSION_SOURCES = ["snapshot", "publish"] as const;
export type WorkflowVersionSource = (typeof WORKFLOW_VERSION_SOURCES)[number];

export const WORKFLOW_TEMPLATE_KINDS = ["starter", "custom"] as const;
export type WorkflowTemplateKind = (typeof WORKFLOW_TEMPLATE_KINDS)[number];

export const WORKFLOW_ENVIRONMENTS = ["dev", "stage", "prod"] as const;
export type WorkflowEnvironment = (typeof WORKFLOW_ENVIRONMENTS)[number];

export const WORKFLOW_PLAYBOOK_VISIBILITIES = [
  "public",
  "private",
  "unlisted",
] as const;
export type WorkflowPlaybookVisibility =
  (typeof WORKFLOW_PLAYBOOK_VISIBILITIES)[number];

export const WORKFLOW_PLAYBOOK_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;
export type WorkflowPlaybookStatus = (typeof WORKFLOW_PLAYBOOK_STATUSES)[number];

export const WORKFLOW_NODE_TYPES = [
  "trigger",
  "action",
  "condition",
  "delay",
  "handoff",
  "approval",
  "end",
] as const;
export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number];

export const WORKFLOW_EDGE_CONDITIONS = ["always", "true", "false"] as const;
export type WorkflowEdgeCondition = (typeof WORKFLOW_EDGE_CONDITIONS)[number];

export const WORKFLOW_MAX_NODES = 300;
export const WORKFLOW_MAX_EDGES = 1200;

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  position: WorkflowNodePosition;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  when: WorkflowEdgeCondition;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, unknown>;
}

export const EMPTY_WORKFLOW_GRAPH: WorkflowGraph = {
  nodes: [],
  edges: [],
};

export interface WorkflowDefinition {
  id: string;
  instance_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  tags: string[];
  owner_id: string | null;
  status: WorkflowStatus;
  draft_graph: WorkflowGraph;
  draft_version: number;
  published_version: number | null;
  is_valid: boolean;
  last_validation_errors: WorkflowValidationError[];
  last_validated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  version: number;
  source: WorkflowVersionSource;
  graph: WorkflowGraph;
  compiled_ir: Record<string, unknown> | null;
  validation_errors: WorkflowValidationError[];
  created_by: string | null;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  instance_id: string | null;
  customer_id: string | null;
  name: string;
  description: string | null;
  template_kind: WorkflowTemplateKind;
  latest_version: number;
  graph: WorkflowGraph;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateVersion {
  id: string;
  template_id: string;
  instance_id: string;
  customer_id: string;
  version: number;
  graph: WorkflowGraph;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface WorkflowEnvironmentVersion {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  environment: WorkflowEnvironment;
  version: number;
  source_environment: WorkflowEnvironment | null;
  promotion_note: string | null;
  metadata: Record<string, unknown>;
  promoted_by: string | null;
  promoted_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEnvironmentPromotionEvent {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  from_environment: WorkflowEnvironment | null;
  to_environment: WorkflowEnvironment;
  version: number;
  promotion_note: string | null;
  metadata: Record<string, unknown>;
  promoted_by: string | null;
  created_at: string;
}

export interface WorkflowPlaybook {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  tags: string[];
  visibility: WorkflowPlaybookVisibility;
  status: WorkflowPlaybookStatus;
  source_workflow_id: string | null;
  source_instance_id: string | null;
  customer_id: string | null;
  latest_version: number;
  graph: WorkflowGraph;
  metadata: Record<string, unknown>;
  install_count: number;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowPlaybookVersion {
  id: string;
  playbook_id: string;
  version: number;
  graph: WorkflowGraph;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface WorkflowPlaybookInstall {
  id: string;
  playbook_id: string;
  playbook_version: number;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  installed_by: string | null;
  metadata: Record<string, unknown>;
  installed_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  trigger_type: WorkflowRunTriggerType;
  status: WorkflowRunStatus;
  source_version: number;
  retry_of_run_id: string | null;
  requested_by: string | null;
  runtime_correlation_id: string | null;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunStep {
  id: string;
  run_id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  node_id: string;
  node_type: WorkflowNodeType;
  step_index: number;
  attempt: number;
  status: WorkflowRunStepStatus;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowApproval {
  id: string;
  run_id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  node_id: string;
  node_label: string | null;
  status: WorkflowApprovalStatus;
  sla_due_at: string | null;
  decision_comment: string | null;
  decision_actor_id: string | null;
  decided_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  canceled_at: string | null;
  expired_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunArtifact {
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
  metadata: Record<string, unknown>;
  created_at: string;
}

export const WORKFLOW_VALIDATION_ERROR_CODES = [
  "SCHEMA_INVALID",
  "WORKFLOW_EMPTY",
  "TRIGGER_NODE_MISSING",
  "TRIGGER_NODE_MULTIPLE",
  "END_NODE_MISSING",
  "NODE_ID_DUPLICATE",
  "EDGE_ID_DUPLICATE",
  "EDGE_SOURCE_MISSING",
  "EDGE_TARGET_MISSING",
  "EDGE_SELF_LOOP",
  "CONDITION_EDGE_REQUIRES_BRANCH",
  "CONDITION_BRANCH_MISSING_TRUE",
  "CONDITION_BRANCH_MISSING_FALSE",
  "UNREACHABLE_NODE",
  "CYCLE_DETECTED",
] as const;

export type WorkflowValidationErrorCode =
  (typeof WORKFLOW_VALIDATION_ERROR_CODES)[number];

export interface WorkflowValidationError {
  code: WorkflowValidationErrorCode;
  message: string;
  path?: string;
  node_id?: string;
  edge_id?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
}
