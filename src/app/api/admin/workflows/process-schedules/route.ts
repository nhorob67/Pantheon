import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  buildScheduledRunCorrelationId,
  floorDateToUtcMinute,
  isCronDueAt,
  resolveScheduledTrigger,
} from "@/lib/workflows/scheduler";

export const runtime = "nodejs";

const MAX_ENQUEUE_LIMIT = 500;
const DEFAULT_ENQUEUE_LIMIT = MAX_ENQUEUE_LIMIT;

interface ProcessSchedulesBody {
  enqueue_limit?: unknown;
  at?: unknown;
  dry_run?: unknown;
}

interface AuthorizationOptions {
  allowSessionAuth: boolean;
}

interface PublishedWorkflowDefinition {
  id: string;
  instance_id: string;
  customer_id: string;
  name: string;
  published_version: number | null;
}

interface PublishedWorkflowVersion {
  workflow_id: string;
  version: number;
  graph: unknown;
}

interface DueWorkflowCandidate {
  workflow: PublishedWorkflowDefinition;
  source_version: number;
  trigger_node_id: string;
  cron: string;
  timezone: string;
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(max, Math.max(min, Math.trunc(value)));
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Math.min(max, Math.max(min, Math.trunc(Number(value.trim()))));
  }

  return fallback;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

async function parseBody(request: Request): Promise<ProcessSchedulesBody> {
  try {
    const body = (await request.json()) as ProcessSchedulesBody;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function parseQueryParams(request: Request): ProcessSchedulesBody {
  try {
    const searchParams = new URL(request.url).searchParams;
    return {
      enqueue_limit: searchParams.get("enqueue_limit") || undefined,
      at: searchParams.get("at") || undefined,
      dry_run: searchParams.get("dry_run") || undefined,
    };
  } catch {
    return {};
  }
}

function parseEvaluationTimestamp(raw: unknown): Date | null {
  if (raw === undefined || raw === null) {
    return new Date();
  }

  if (typeof raw !== "string") {
    return null;
  }

  if (raw.trim().length === 0) {
    return new Date();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

async function isAuthorized(
  request: Request,
  options: AuthorizationOptions
): Promise<boolean> {
  const expectedTokens = [
    process.env.WORKFLOW_SCHEDULE_PROCESSOR_TOKEN,
    process.env.WORKFLOW_RUN_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-workflow-schedule-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  if (!options.allowSessionAuth) {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return !!(user && isAdmin(user.email));
}

async function processSchedulesRequest(
  request: Request,
  options: { body: ProcessSchedulesBody; allowSessionAuth: boolean }
) {
  const authorized = await isAuthorized(request, {
    allowSessionAuth: options.allowSessionAuth,
  });
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enqueueLimit = clampInt(
    options.body.enqueue_limit,
    DEFAULT_ENQUEUE_LIMIT,
    1,
    MAX_ENQUEUE_LIMIT
  );
  const dryRun = parseBoolean(options.body.dry_run, false);
  const evaluationDate = parseEvaluationTimestamp(options.body.at);
  if (!evaluationDate) {
    return NextResponse.json(
      { error: "Invalid timestamp for 'at'. Use an ISO-8601 date/time string." },
      { status: 400 }
    );
  }

  const slotDate = floorDateToUtcMinute(evaluationDate);
  const slotUtc = slotDate.toISOString();

  const admin = createAdminClient();
  const { data: definitionsData, error: definitionsError } = await admin
    .from("workflow_definitions")
    .select("id, instance_id, customer_id, name, published_version")
    .eq("status", "published")
    .not("published_version", "is", null);

  if (definitionsError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          definitionsError,
          "Failed to load published workflows for schedule processing"
        ),
      },
      { status: 500 }
    );
  }

  const definitions = (definitionsData ||
    []) as PublishedWorkflowDefinition[];
  if (definitions.length === 0) {
    return NextResponse.json({
      evaluated_at: evaluationDate.toISOString(),
      slot_utc: slotUtc,
      scanned: 0,
      due: 0,
      enqueued: 0,
      duplicate: 0,
      failed: 0,
      dry_run: dryRun,
    });
  }

  const workflowIds = Array.from(new Set(definitions.map((row) => row.id)));
  const publishedVersions = Array.from(
    new Set(
      definitions
        .map((row) => Number(row.published_version))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (publishedVersions.length === 0) {
    return NextResponse.json({
      evaluated_at: evaluationDate.toISOString(),
      slot_utc: slotUtc,
      scanned: definitions.length,
      due: 0,
      enqueued: 0,
      duplicate: 0,
      failed: 0,
      skipped: {
        missing_snapshot: definitions.length,
        non_schedule: 0,
        not_due: 0,
        invalid_schedule: 0,
        enqueue_limit: 0,
      },
      dry_run: dryRun,
    });
  }

  const { data: versionsData, error: versionsError } = await admin
    .from("workflow_versions")
    .select("workflow_id, version, graph")
    .in("workflow_id", workflowIds)
    .in("version", publishedVersions);

  if (versionsError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          versionsError,
          "Failed to load published workflow snapshots for schedule processing"
        ),
      },
      { status: 500 }
    );
  }

  const versionsByKey = new Map<string, PublishedWorkflowVersion>(
    ((versionsData || []) as PublishedWorkflowVersion[]).map((row) => [
      `${row.workflow_id}:${row.version}`,
      row,
    ])
  );

  const dueCandidates: DueWorkflowCandidate[] = [];
  let dueCount = 0;
  let skippedMissingSnapshot = 0;
  let skippedNonSchedule = 0;
  let skippedNotDue = 0;
  let skippedInvalidSchedule = 0;
  let skippedEnqueueLimit = 0;

  for (const workflow of definitions) {
    const sourceVersion = Number(workflow.published_version);
    if (!Number.isInteger(sourceVersion) || sourceVersion <= 0) {
      skippedMissingSnapshot += 1;
      continue;
    }

    const snapshot = versionsByKey.get(`${workflow.id}:${sourceVersion}`);
    if (!snapshot) {
      skippedMissingSnapshot += 1;
      continue;
    }

    const scheduleTrigger = resolveScheduledTrigger(snapshot.graph);
    if (!scheduleTrigger) {
      skippedNonSchedule += 1;
      continue;
    }

    const dueResult = isCronDueAt(
      scheduleTrigger.cron,
      scheduleTrigger.timezone,
      slotDate
    );
    if (dueResult.invalid) {
      skippedInvalidSchedule += 1;
      continue;
    }
    if (!dueResult.due) {
      skippedNotDue += 1;
      continue;
    }

    dueCount += 1;
    if (dueCandidates.length >= enqueueLimit) {
      skippedEnqueueLimit += 1;
      continue;
    }

    dueCandidates.push({
      workflow,
      source_version: sourceVersion,
      trigger_node_id: scheduleTrigger.trigger_node_id,
      cron: scheduleTrigger.cron,
      timezone: scheduleTrigger.timezone,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      evaluated_at: evaluationDate.toISOString(),
      slot_utc: slotUtc,
      scanned: definitions.length,
      due: dueCount,
      enqueued: 0,
      duplicate: 0,
      failed: 0,
      skipped: {
        missing_snapshot: skippedMissingSnapshot,
        non_schedule: skippedNonSchedule,
        not_due: skippedNotDue,
        invalid_schedule: skippedInvalidSchedule,
        enqueue_limit: skippedEnqueueLimit,
      },
      dry_run: true,
    });
  }

  let enqueued = 0;
  let duplicate = 0;
  let failed = 0;
  let stepSeedFailed = 0;
  const errors: Array<{ workflow_id: string; message: string }> = [];

  for (const candidate of dueCandidates) {
    const nowIso = new Date().toISOString();
    const runtimeCorrelationId = buildScheduledRunCorrelationId(
      candidate.workflow.id,
      candidate.source_version,
      slotUtc
    );

    const { data: insertedRun, error: insertError } = await admin
      .from("workflow_runs")
      .insert({
        workflow_id: candidate.workflow.id,
        instance_id: candidate.workflow.instance_id,
        customer_id: candidate.workflow.customer_id,
        trigger_type: "schedule",
        status: "queued",
        source_version: candidate.source_version,
        requested_by: null,
        runtime_correlation_id: runtimeCorrelationId,
        input_payload: {},
        metadata: {
          queued_at: nowIso,
          runtime_state: "pending_runtime_bridge",
          schedule: {
            cron: candidate.cron,
            timezone: candidate.timezone,
            slot_utc: slotUtc,
            enqueued_by: "api/admin/workflows/process-schedules",
          },
        },
      })
      .select("id")
      .single();

    if (insertError) {
      if ((insertError as { code?: string }).code === "23505") {
        duplicate += 1;
        continue;
      }

      failed += 1;
      errors.push({
        workflow_id: candidate.workflow.id,
        message: safeErrorMessage(insertError, "Failed to enqueue scheduled run"),
      });
      continue;
    }

    if (!insertedRun?.id) {
      failed += 1;
      errors.push({
        workflow_id: candidate.workflow.id,
        message: "Scheduled run insert returned no row.",
      });
      continue;
    }

    enqueued += 1;

    const { error: seedError } = await admin.from("workflow_run_steps").insert({
      run_id: insertedRun.id,
      workflow_id: candidate.workflow.id,
      instance_id: candidate.workflow.instance_id,
      customer_id: candidate.workflow.customer_id,
      node_id: candidate.trigger_node_id,
      node_type: "trigger",
      step_index: 0,
      attempt: 1,
      status: "pending",
      metadata: {
        seeded_from: "schedule_enqueuer",
        schedule_slot_utc: slotUtc,
      },
    });

    if (seedError) {
      stepSeedFailed += 1;
    }

    auditLog({
      action: "workflow.run.scheduled",
      actor: "workflow-schedule-enqueuer",
      resource_type: "workflow_run",
      resource_id: insertedRun.id,
      details: {
        customer_id: candidate.workflow.customer_id,
        instance_id: candidate.workflow.instance_id,
        workflow_id: candidate.workflow.id,
        workflow_name: candidate.workflow.name,
        source_version: candidate.source_version,
        slot_utc: slotUtc,
      },
    });
  }

  return NextResponse.json({
    evaluated_at: evaluationDate.toISOString(),
    slot_utc: slotUtc,
    scanned: definitions.length,
    due: dueCount,
    enqueued,
    duplicate,
    failed,
    step_seed_failed: stepSeedFailed,
    skipped: {
      missing_snapshot: skippedMissingSnapshot,
      non_schedule: skippedNonSchedule,
      not_due: skippedNotDue,
      invalid_schedule: skippedInvalidSchedule,
      enqueue_limit: skippedEnqueueLimit,
    },
    dry_run: false,
    errors: errors.slice(0, 20),
  });
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  return processSchedulesRequest(request, {
    body,
    allowSessionAuth: true,
  });
}

export async function GET(request: Request) {
  const body = parseQueryParams(request);
  return processSchedulesRequest(request, {
    body,
    allowSessionAuth: false,
  });
}
