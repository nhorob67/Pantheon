import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { processQueuedWorkflowRuns } from "@/lib/workflows/run-processor";
import { processRuntimeRun } from "./process-runtime-run";

export const processWorkflowRuns = schedules.task({
  id: "process-workflow-runs",
  cron: "*/1 * * * *",
  retry: {
    maxAttempts: 2,
  },
  run: async () => {
    const admin = createTriggerAdminClient();

    const result = await processQueuedWorkflowRuns(admin, {
      onDispatch: async (_run, runId) => {
        // Chain to the existing Trigger.dev LLM executor
        await processRuntimeRun.trigger({ runId });
      },
    });

    return result;
  },
});
