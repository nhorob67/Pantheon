import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import {
  persistWorkflowLaunchReadinessSnapshot,
  type WorkflowLaunchReadinessCaptureSource,
} from "@/lib/workflows/launch-readiness";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";

const DEFAULT_DAYS = 30;
const DEFAULT_MIN_SAMPLES = 5;
const DEFAULT_INSTANCE_LIMIT = 500;

export const captureLaunchReadiness = schedules.task({
  id: "capture-launch-readiness",
  cron: "15 * * * *",
  retry: {
    maxAttempts: 2,
  },
  run: async () => {
    const admin = createTriggerAdminClient();
    const captureSource: WorkflowLaunchReadinessCaptureSource = "scheduled";

    const { data: instancesData, error: instancesError } = await admin
      .from("instances")
      .select("id, customer_id")
      .order("created_at", { ascending: false })
      .limit(DEFAULT_INSTANCE_LIMIT);

    if (instancesError) {
      throw new Error(
        safeErrorMessage(
          instancesError,
          "Failed to load instances for launch-readiness capture"
        )
      );
    }

    const instances = (instancesData || []) as Array<{
      id: string;
      customer_id: string;
    }>;

    if (instances.length === 0) {
      return {
        scanned_instances: 0,
        captured: 0,
        skipped_builder_disabled: 0,
        failed: 0,
      };
    }

    let captured = 0;
    let skippedBuilderDisabled = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const instance of instances) {
      const workflowBuilderEnabled =
        await isWorkflowBuilderEnabledForCustomer(admin, instance.customer_id);

      if (!workflowBuilderEnabled) {
        skippedBuilderDisabled += 1;
        continue;
      }

      try {
        await persistWorkflowLaunchReadinessSnapshot(admin, {
          customerId: instance.customer_id,
          instanceId: instance.id,
          timeframeDays: DEFAULT_DAYS,
          minSamplesPerMetric: DEFAULT_MIN_SAMPLES,
          captureSource,
        });
        captured += 1;
      } catch (error) {
        failed += 1;
        errors.push(
          `${instance.id}: ${safeErrorMessage(
            error,
            "Launch-readiness capture failed"
          )}`
        );
      }
    }

    auditLog({
      action: "workflow.launch_readiness.capture",
      actor: "workflow-launch-readiness-cron",
      resource_type: "workflow_launch_readiness",
      resource_id: "batch",
      details: {
        scanned_instances: instances.length,
        captured,
        skipped_builder_disabled: skippedBuilderDisabled,
        failed,
        days: DEFAULT_DAYS,
        min_samples: DEFAULT_MIN_SAMPLES,
        capture_source: captureSource,
      },
    });

    return {
      scanned_instances: instances.length,
      captured,
      skipped_builder_disabled: skippedBuilderDisabled,
      failed,
      errors: errors.slice(0, 25),
    };
  },
});
