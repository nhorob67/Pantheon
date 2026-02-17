import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listWorkflowEnvironmentPromotionEvents,
  listWorkflowEnvironmentVersions,
  normalizeWorkflowEnvironmentPromotionEventRow,
  normalizeWorkflowEnvironmentVersionRow,
} from "@/lib/queries/workflow-promotions";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  WORKFLOW_ENVIRONMENTS,
  type WorkflowEnvironment,
  type WorkflowEnvironmentPromotionEvent,
  type WorkflowEnvironmentVersion,
} from "@/types/workflow";

export const WORKFLOW_ENVIRONMENT_PROMOTION_ORDER: WorkflowEnvironment[] = [
  "dev",
  "stage",
  "prod",
];

interface PromoteWorkflowEnvironmentInput {
  admin: SupabaseClient;
  instanceId: string;
  customerId: string;
  workflowId: string;
  targetEnvironment: WorkflowEnvironment;
  sourceVersion?: number;
  note?: string;
  metadata?: Record<string, unknown>;
  actorId: string;
}

export interface WorkflowPromotionState {
  by_environment: Record<WorkflowEnvironment, WorkflowEnvironmentVersion | null>;
  versions: WorkflowEnvironmentVersion[];
  history: WorkflowEnvironmentPromotionEvent[];
}

function environmentRank(environment: WorkflowEnvironment): number {
  return WORKFLOW_ENVIRONMENT_PROMOTION_ORDER.indexOf(environment);
}

function ensureEnvironment(value: WorkflowEnvironment): WorkflowEnvironment {
  if (WORKFLOW_ENVIRONMENTS.includes(value)) {
    return value;
  }

  return "dev";
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function buildEnvironmentState(
  versions: WorkflowEnvironmentVersion[]
): Record<WorkflowEnvironment, WorkflowEnvironmentVersion | null> {
  const byEnvironment: Record<WorkflowEnvironment, WorkflowEnvironmentVersion | null> = {
    dev: null,
    stage: null,
    prod: null,
  };

  for (const version of versions) {
    byEnvironment[ensureEnvironment(version.environment)] = version;
  }

  return byEnvironment;
}

export async function getWorkflowPromotionState(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  workflowId: string
): Promise<WorkflowPromotionState> {
  const [versions, history] = await Promise.all([
    listWorkflowEnvironmentVersions(admin, instanceId, customerId, workflowId),
    listWorkflowEnvironmentPromotionEvents(
      admin,
      instanceId,
      customerId,
      workflowId,
      40
    ),
  ]);

  return {
    by_environment: buildEnvironmentState(versions),
    versions,
    history,
  };
}

function resolvePromotionSourceEnvironment(
  targetEnvironment: WorkflowEnvironment
): WorkflowEnvironment | null {
  if (targetEnvironment === "dev") {
    return null;
  }

  if (targetEnvironment === "stage") {
    return "dev";
  }

  return "stage";
}

async function assertWorkflowVersionExists(input: {
  admin: SupabaseClient;
  instanceId: string;
  customerId: string;
  workflowId: string;
  version: number;
}): Promise<void> {
  const { data, error } = await input.admin
    .from("workflow_versions")
    .select("workflow_id, version")
    .eq("workflow_id", input.workflowId)
    .eq("instance_id", input.instanceId)
    .eq("customer_id", input.customerId)
    .eq("version", input.version)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to verify workflow version for promotion")
    );
  }

  if (!data) {
    throw new Error(
      `Workflow version v${input.version} does not exist and cannot be promoted.`
    );
  }
}

export async function promoteWorkflowEnvironment(
  input: PromoteWorkflowEnvironmentInput
): Promise<{
  promoted_version: WorkflowEnvironmentVersion;
  event: WorkflowEnvironmentPromotionEvent;
  state: WorkflowPromotionState;
}> {
  const sourceEnvironment = resolvePromotionSourceEnvironment(input.targetEnvironment);

  const [workflowResult, currentState] = await Promise.all([
    input.admin
      .from("workflow_definitions")
      .select("id, status, published_version")
      .eq("id", input.workflowId)
      .eq("instance_id", input.instanceId)
      .eq("customer_id", input.customerId)
      .maybeSingle(),
    getWorkflowPromotionState(
      input.admin,
      input.instanceId,
      input.customerId,
      input.workflowId
    ),
  ]);

  if (workflowResult.error) {
    throw new Error(
      safeErrorMessage(workflowResult.error, "Failed to load workflow for promotion")
    );
  }

  if (!workflowResult.data) {
    throw new Error("Workflow not found.");
  }

  const workflow = workflowResult.data;
  const byEnvironment = currentState.by_environment;

  let resolvedVersion = input.sourceVersion;

  if (input.targetEnvironment === "dev") {
    if (!resolvedVersion) {
      resolvedVersion = workflow.published_version ?? undefined;
    }

    if (!resolvedVersion) {
      throw new Error(
        "Publish the workflow first, then promote a published version to dev."
      );
    }

    if (workflow.status !== "published") {
      throw new Error("Only published workflows can be promoted.");
    }
  }

  if (input.targetEnvironment === "stage") {
    const devVersion = byEnvironment.dev?.version;
    if (!devVersion) {
      throw new Error("Promote to dev before promoting to stage.");
    }

    if (resolvedVersion && resolvedVersion !== devVersion) {
      throw new Error(
        `Stage promotion must use the dev-promoted version v${devVersion}.`
      );
    }

    resolvedVersion = devVersion;
  }

  if (input.targetEnvironment === "prod") {
    const stageVersion = byEnvironment.stage?.version;
    if (!stageVersion) {
      throw new Error("Promote to stage before promoting to prod.");
    }

    if (resolvedVersion && resolvedVersion !== stageVersion) {
      throw new Error(
        `Prod promotion must use the stage-promoted version v${stageVersion}.`
      );
    }

    resolvedVersion = stageVersion;
  }

  if (!resolvedVersion || resolvedVersion <= 0) {
    throw new Error("Invalid promotion source version.");
  }

  await assertWorkflowVersionExists({
    admin: input.admin,
    instanceId: input.instanceId,
    customerId: input.customerId,
    workflowId: input.workflowId,
    version: resolvedVersion,
  });

  const currentTargetRank = environmentRank(input.targetEnvironment);
  const sourceRank = sourceEnvironment ? environmentRank(sourceEnvironment) : -1;

  if (sourceRank >= currentTargetRank) {
    throw new Error("Invalid environment promotion order.");
  }

  const promotionMetadata = {
    ...(input.metadata || {}),
    promoted_via: "workflow_promotion_api",
    requested_source_version: input.sourceVersion ?? null,
  };

  const { data: upsertedVersionRow, error: upsertVersionError } = await input.admin
    .from("workflow_environment_versions")
    .upsert(
      {
        workflow_id: input.workflowId,
        instance_id: input.instanceId,
        customer_id: input.customerId,
        environment: input.targetEnvironment,
        version: resolvedVersion,
        source_environment: sourceEnvironment,
        promotion_note: input.note ?? null,
        metadata: promotionMetadata,
        promoted_by: input.actorId,
        promoted_at: new Date().toISOString(),
      },
      {
        onConflict: "workflow_id,environment",
      }
    )
    .select(
      "id, workflow_id, instance_id, customer_id, environment, version, source_environment, promotion_note, metadata, promoted_by, promoted_at, created_at, updated_at"
    )
    .single();

  if (upsertVersionError || !upsertedVersionRow) {
    throw new Error(
      safeErrorMessage(upsertVersionError, "Failed to persist environment promotion")
    );
  }

  const { data: eventRow, error: eventError } = await input.admin
    .from("workflow_environment_promotion_events")
    .insert({
      workflow_id: input.workflowId,
      instance_id: input.instanceId,
      customer_id: input.customerId,
      from_environment: sourceEnvironment,
      to_environment: input.targetEnvironment,
      version: resolvedVersion,
      promotion_note: input.note ?? null,
      metadata: promotionMetadata,
      promoted_by: input.actorId,
    })
    .select(
      "id, workflow_id, instance_id, customer_id, from_environment, to_environment, version, promotion_note, metadata, promoted_by, created_at"
    )
    .single();

  if (eventError || !eventRow) {
    throw new Error(
      safeErrorMessage(eventError, "Failed to persist promotion history event")
    );
  }

  const nextState = await getWorkflowPromotionState(
    input.admin,
    input.instanceId,
    input.customerId,
    input.workflowId
  );

  return {
    promoted_version: normalizeWorkflowEnvironmentVersionRow(
      upsertedVersionRow as Parameters<typeof normalizeWorkflowEnvironmentVersionRow>[0]
    ),
    event: normalizeWorkflowEnvironmentPromotionEventRow(
      eventRow as Parameters<typeof normalizeWorkflowEnvironmentPromotionEventRow>[0]
    ),
    state: nextState,
  };
}

export function resolvePromotionSummary(state: WorkflowPromotionState): {
  dev: number | null;
  stage: number | null;
  prod: number | null;
} {
  return {
    dev: state.by_environment.dev?.version ?? null,
    stage: state.by_environment.stage?.version ?? null,
    prod: state.by_environment.prod?.version ?? null,
  };
}

export function resolvePromotionReadiness(state: WorkflowPromotionState): {
  can_promote_to_dev: boolean;
  can_promote_to_stage: boolean;
  can_promote_to_prod: boolean;
} {
  return {
    can_promote_to_dev: true,
    can_promote_to_stage: !!state.by_environment.dev,
    can_promote_to_prod: !!state.by_environment.stage,
  };
}

export function normalizePromotionMetadata(
  value: unknown
): Record<string, unknown> {
  return normalizeMetadata(value);
}
