export type ExtensionKind =
  | "skill"
  | "plugin"
  | "connector"
  | "mcp_server"
  | "tool_pack";

export type ExtensionSourceType =
  | "local"
  | "npm"
  | "git"
  | "clawhub"
  | "internal";

export interface ExtensionTrustPolicy {
  allowed_source_types: ExtensionSourceType[];
  require_verified_source_types: ExtensionSourceType[];
}

export interface ExtensionCustomerTrustPolicy extends ExtensionTrustPolicy {
  id: string;
  customer_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtensionCatalogItem {
  id: string;
  slug: string;
  kind: ExtensionKind;
  display_name: string;
  description: string | null;
  source_type: ExtensionSourceType;
  source_ref: string;
  homepage_url: string | null;
  docs_url: string | null;
  verified: boolean;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExtensionCatalogVersion {
  id: string;
  item_id: string;
  version: string;
  release_notes: string | null;
  manifest: Record<string, unknown>;
  checksum_sha256: string | null;
  published_at: string;
  created_at: string;
}

export type ExtensionInstallStatus =
  | "pending"
  | "installing"
  | "installed"
  | "failed"
  | "rollback_pending"
  | "rolled_back"
  | "removed";

export type ExtensionHealthStatus =
  | "unknown"
  | "healthy"
  | "degraded"
  | "unhealthy";

export interface ExtensionInstallation {
  id: string;
  customer_id: string;
  instance_id: string | null;
  item_id: string;
  version_id: string | null;
  pinned_version: string | null;
  install_status: ExtensionInstallStatus;
  health_status: ExtensionHealthStatus;
  config: Record<string, unknown>;
  installed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export type ExtensionOperationType =
  | "install"
  | "upgrade"
  | "rollback"
  | "remove"
  | "sync_catalog";

export type ExtensionOperationScope =
  | "instance"
  | "customer"
  | "fleet"
  | "catalog";

export type ExtensionOperationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "canceled";

export interface ExtensionOperation {
  id: string;
  operation_type: ExtensionOperationType;
  scope_type: ExtensionOperationScope;
  status: ExtensionOperationStatus;
  customer_id: string | null;
  instance_id: string | null;
  requested_by: string;
  requested_reason: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ExtensionOperationTargetStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";

export interface ExtensionOperationTarget {
  id: string;
  operation_id: string;
  installation_id: string | null;
  target_version_id: string | null;
  status: ExtensionOperationTargetStatus;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ClaimedExtensionOperationTarget {
  id: string;
  installation_id: string | null;
  target_version_id: string | null;
}

export interface ExtensionOperationProgress {
  status: ExtensionOperationStatus;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  skipped: number;
  remaining: number;
}

export type ExtensionRolloutRing = "canary" | "standard" | "delayed";

export type ExtensionRolloutStatus =
  | "pending"
  | "in_progress"
  | "paused"
  | "completed"
  | "failed"
  | "canceled"
  | "halted";

export interface ExtensionUpdateRollout {
  id: string;
  customer_id: string | null;
  item_id: string;
  target_version_id: string;
  initiated_by: string;
  status: ExtensionRolloutStatus;
  current_ring: ExtensionRolloutRing | null;
  ring_order: ExtensionRolloutRing[];
  ring_config: Record<string, unknown>;
  gate_config: Record<string, unknown>;
  notes: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ExtensionRolloutTargetStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped"
  | "rolled_back";

export interface ExtensionUpdateRolloutTarget {
  id: string;
  rollout_id: string;
  installation_id: string;
  ring: ExtensionRolloutRing;
  status: ExtensionRolloutTargetStatus;
  operation_id: string | null;
  attempt_count: number;
  latency_ms: number | null;
  timeout_count: number;
  hard_error_count: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
