import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import {
  buildScheduledRunCorrelationId,
  floorDateToUtcMinute,
  isCronDueAt,
  resolveScheduledTrigger,
} from "@/lib/workflows/scheduler";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { processQueuedWorkflowRuns } from "@/lib/workflows/run-processor";
import { processRuntimeRun } from "./process-runtime-run";

const MAX_ENQUEUE_LIMIT = 500;

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

export const processWorkflowSchedules = schedules.task({
  id: "process-workflow-schedules",
  cron: "*/1 * * * *",
  retry: {
    maxAttempts: 2,
  },
  run: async () => {
    const admin = createTriggerAdminClient();
    const evaluationDate = new Date();
    const slotDate = floorDateToUtcMinute(evaluationDate);
    const slotUtc = slotDate.toISOString();

    const { data: definitionsData, error: definitionsError } = await admin
      .from("workflow_definitions")
      .select("id, instance_id, customer_id, name, published_version")
      .eq("status", "published")
      .not("published_version", "is", null);

    if (definitionsError) {
      throw new Error(
        safeErrorMessage(
          definitionsError,
          "Failed to load published workflows for schedule processing"
        )
      );
    }

    const definitions = (definitionsData || []) as PublishedWorkflowDefinition[];
    if (definitions.length === 0) {
      return {
        slot_utc: slotUtc,
        scanned: 0,
        due: 0,
        enqueued: 0,
        duplicate: 0,
        failed: 0,
      };
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
      return {
        slot_utc: slotUtc,
        scanned: definitions.length,
        due: 0,
        enqueued: 0,
        duplicate: 0,
        failed: 0,
      };
    }

    const { data: versionsData, error: versionsError } = await admin
      .from("workflow_versions")
      .select("workflow_id, version, graph")
      .in("workflow_id", workflowIds)
      .in("version", publishedVersions);

    if (versionsError) {
      throw new Error(
        safeErrorMessage(
          versionsError,
          "Failed to load published workflow snapshots for schedule processing"
        )
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
      if (dueCandidates.length >= MAX_ENQUEUE_LIMIT) {
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
              enqueued_by: "trigger/process-workflow-schedules",
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

    // Process queued workflow runs (merged from process-workflow-runs)
    let queuedRunsResult = null;
    try {
      queuedRunsResult = await processQueuedWorkflowRuns(admin, {
        onDispatch: async (_run, runId) => {
          await processRuntimeRun.trigger({ runId });
        },
      });
    } catch (err) {
      console.error("[process-workflow-schedules] Queued runs processing failed:", err);
    }

    return {
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
      errors: errors.slice(0, 20),
      queued_runs: queuedRunsResult,
    };
  },
});
