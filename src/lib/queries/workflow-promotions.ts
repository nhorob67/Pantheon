import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  WORKFLOW_ENVIRONMENTS,
  type WorkflowEnvironment,
  type WorkflowEnvironmentPromotionEvent,
  type WorkflowEnvironmentVersion,
} from "@/types/workflow";

const WORKFLOW_ENVIRONMENT_VALUES = new Set<WorkflowEnvironment>(
  WORKFLOW_ENVIRONMENTS
);

interface WorkflowEnvironmentVersionRow {
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

interface WorkflowEnvironmentPromotionEventRow {
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

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeWorkflowEnvironment(value: string): WorkflowEnvironment {
  if (WORKFLOW_ENVIRONMENT_VALUES.has(value as WorkflowEnvironment)) {
    return value as WorkflowEnvironment;
  }

  return "dev";
}

function normalizeWorkflowEnvironmentNullable(
  value: string | null
): WorkflowEnvironment | null {
  if (!value) {
    return null;
  }

  if (WORKFLOW_ENVIRONMENT_VALUES.has(value as WorkflowEnvironment)) {
    return value as WorkflowEnvironment;
  }

  return null;
}

export function normalizeWorkflowEnvironmentVersionRow(
  row: WorkflowEnvironmentVersionRow
): WorkflowEnvironmentVersion {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    environment: normalizeWorkflowEnvironment(row.environment),
    version: row.version,
    source_environment: normalizeWorkflowEnvironmentNullable(row.source_environment),
    promotion_note: row.promotion_note,
    metadata: normalizeObject(row.metadata),
    promoted_by: row.promoted_by,
    promoted_at: row.promoted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeWorkflowEnvironmentPromotionEventRow(
  row: WorkflowEnvironmentPromotionEventRow
): WorkflowEnvironmentPromotionEvent {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    from_environment: normalizeWorkflowEnvironmentNullable(row.from_environment),
    to_environment: normalizeWorkflowEnvironment(row.to_environment),
    version: row.version,
    promotion_note: row.promotion_note,
    metadata: normalizeObject(row.metadata),
    promoted_by: row.promoted_by,
    created_at: row.created_at,
  };
}

const WORKFLOW_ENVIRONMENT_VERSION_SELECT_COLUMNS =
  "id, workflow_id, instance_id, customer_id, environment, version, source_environment, promotion_note, metadata, promoted_by, promoted_at, created_at, updated_at";

const WORKFLOW_ENVIRONMENT_PROMOTION_EVENT_SELECT_COLUMNS =
  "id, workflow_id, instance_id, customer_id, from_environment, to_environment, version, promotion_note, metadata, promoted_by, created_at";

export async function listWorkflowEnvironmentVersions(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  workflowId: string
): Promise<WorkflowEnvironmentVersion[]> {
  const { data, error } = await admin
    .from("workflow_environment_versions")
    .select(WORKFLOW_ENVIRONMENT_VERSION_SELECT_COLUMNS)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .eq("workflow_id", workflowId)
    .order("environment", { ascending: true });

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load workflow environment versions")
    );
  }

  return ((data || []) as WorkflowEnvironmentVersionRow[]).map(
    normalizeWorkflowEnvironmentVersionRow
  );
}

export async function listWorkflowEnvironmentPromotionEvents(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  workflowId: string,
  limit = 40
): Promise<WorkflowEnvironmentPromotionEvent[]> {
  const { data, error } = await admin
    .from("workflow_environment_promotion_events")
    .select(WORKFLOW_ENVIRONMENT_PROMOTION_EVENT_SELECT_COLUMNS)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, Math.trunc(limit))));

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load workflow promotion history")
    );
  }

  return ((data || []) as WorkflowEnvironmentPromotionEventRow[]).map(
    normalizeWorkflowEnvironmentPromotionEventRow
  );
}
