export type PublishRuntimeFreshnessErrorCode =
  | "WORKFLOW_DEPLOY_FAILED"
  | "WORKFLOW_DEPLOY_FAILED_ROLLBACK_FAILED";

export interface PublishRuntimeFreshnessFailure {
  ok: false;
  status: 500 | 503;
  code: PublishRuntimeFreshnessErrorCode;
  error: string;
  rollback_error_message?: string;
}

export interface PublishRuntimeFreshnessSuccess {
  ok: true;
}

export type PublishRuntimeFreshnessResult =
  | PublishRuntimeFreshnessSuccess
  | PublishRuntimeFreshnessFailure;

interface PublishRuntimeFreshnessDeps {
  deploy: () => Promise<void>;
  rollbackPublishedState: () => Promise<{ success: true } | { success: false; error: unknown }>;
  formatError: (error: unknown, fallback: string) => string;
}

export async function ensurePublishedWorkflowRuntimeFreshness(
  deps: PublishRuntimeFreshnessDeps
): Promise<PublishRuntimeFreshnessResult> {
  try {
    await deps.deploy();
    return { ok: true };
  } catch (deployError) {
    const rollbackResult = await deps.rollbackPublishedState();

    if (!rollbackResult.success) {
      return {
        ok: false,
        status: 500,
        code: "WORKFLOW_DEPLOY_FAILED_ROLLBACK_FAILED",
        error:
          "Workflow publish failed during runtime deploy and automatic rollback failed. Retry publish after verifying workflow state.",
        rollback_error_message: deps.formatError(
          rollbackResult.error,
          "Rollback failed"
        ),
      };
    }

    return {
      ok: false,
      status: 503,
      code: "WORKFLOW_DEPLOY_FAILED",
      error: deps.formatError(
        deployError,
        "Workflow publish failed during runtime deploy. Publish was rolled back."
      ),
    };
  }
}
