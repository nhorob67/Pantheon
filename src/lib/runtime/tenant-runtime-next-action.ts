import type { SupabaseClient } from "@supabase/supabase-js";
import {
  patchTenantRuntimeRunMetadata,
} from "./tenant-runtime-queue";
import { resumeTenantToolInvocationWithToken } from "./tenant-runtime-tools";
import type {
  TenantRuntimeApprovedToolNextAction,
  TenantRuntimeNextAction,
  TenantRuntimeRun,
} from "@/types/tenant-runtime";

const SUMMARY_MAX_LENGTH = 600;

function truncateString(value: string, maxLength = SUMMARY_MAX_LENGTH): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function summarizeValue(value: unknown): string {
  if (typeof value === "string") {
    return truncateString(value);
  }

  try {
    return truncateString(JSON.stringify(value ?? {}));
  } catch {
    return "[unserializable result]";
  }
}

function sanitizeArgsSummary(args: Record<string, unknown>): string {
  const sanitizedArgs: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (
      typeof value === "string" &&
      (key.includes("key") ||
        key.includes("secret") ||
        key.includes("token") ||
        key.includes("password"))
    ) {
      sanitizedArgs[key] = "[provided]";
    } else {
      sanitizedArgs[key] = value;
    }
  }

  return summarizeValue(sanitizedArgs);
}

export function buildApprovedToolContinuationNextAction(input: {
  approvalId: string;
  toolKey: string;
  invocationId?: string | null;
  requestArgs?: Record<string, unknown> | null;
  continuationToken?: string | null;
  approvedToolExecution?: {
    completed: boolean;
    resultSummary?: string;
    error?: string;
  } | null;
}): TenantRuntimeApprovedToolNextAction {
  const base: TenantRuntimeApprovedToolNextAction = {
    kind: "approved_tool_continuation",
    state: "queued",
    created_at: new Date().toISOString(),
    approval_id: input.approvalId,
    tool_key: input.toolKey,
    invocation_id: input.invocationId ?? null,
    args_summary: input.requestArgs ? sanitizeArgsSummary(input.requestArgs) : null,
    execution: input.approvedToolExecution
      ? {
          mode: "server_executed",
          status: input.approvedToolExecution.completed ? "completed" : "failed",
          result_summary: input.approvedToolExecution.resultSummary ?? null,
          error: input.approvedToolExecution.error ?? null,
        }
      : {
          mode: "resume_invocation",
          continuation_token: input.continuationToken ?? "",
        },
    result: null,
  };

  return base;
}

export function parseTenantRuntimeNextAction(
  value: unknown
): TenantRuntimeNextAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.kind !== "approved_tool_continuation") {
    return null;
  }
  if (candidate.state !== "queued" && candidate.state !== "consumed") {
    return null;
  }
  if (
    typeof candidate.created_at !== "string" ||
    typeof candidate.approval_id !== "string" ||
    typeof candidate.tool_key !== "string"
  ) {
    return null;
  }

  const execution =
    candidate.execution &&
    typeof candidate.execution === "object" &&
    !Array.isArray(candidate.execution)
      ? (candidate.execution as Record<string, unknown>)
      : null;
  if (!execution) {
    return null;
  }

  if (
    execution.mode === "resume_invocation" &&
    typeof execution.continuation_token === "string" &&
    execution.continuation_token.length > 0
  ) {
    return {
      kind: "approved_tool_continuation",
      state: candidate.state,
      created_at: candidate.created_at,
      consumed_at:
        typeof candidate.consumed_at === "string" ? candidate.consumed_at : null,
      approval_id: candidate.approval_id,
      tool_key: candidate.tool_key,
      invocation_id:
        typeof candidate.invocation_id === "string" ? candidate.invocation_id : null,
      args_summary:
        typeof candidate.args_summary === "string" ? candidate.args_summary : null,
      execution: {
        mode: "resume_invocation",
        continuation_token: execution.continuation_token,
      },
      result:
        candidate.result &&
        typeof candidate.result === "object" &&
        !Array.isArray(candidate.result)
          ? {
              status:
                (candidate.result as Record<string, unknown>).status === "completed"
                  ? "completed"
                  : "failed",
              result_summary:
                typeof (candidate.result as Record<string, unknown>).result_summary === "string"
                  ? ((candidate.result as Record<string, unknown>).result_summary as string)
                  : null,
              error:
                typeof (candidate.result as Record<string, unknown>).error === "string"
                  ? ((candidate.result as Record<string, unknown>).error as string)
                  : null,
            }
          : null,
    };
  }

  if (
    execution.mode === "server_executed" &&
    (execution.status === "completed" || execution.status === "failed")
  ) {
    return {
      kind: "approved_tool_continuation",
      state: candidate.state,
      created_at: candidate.created_at,
      consumed_at:
        typeof candidate.consumed_at === "string" ? candidate.consumed_at : null,
      approval_id: candidate.approval_id,
      tool_key: candidate.tool_key,
      invocation_id:
        typeof candidate.invocation_id === "string" ? candidate.invocation_id : null,
      args_summary:
        typeof candidate.args_summary === "string" ? candidate.args_summary : null,
      execution: {
        mode: "server_executed",
        status: execution.status,
        result_summary:
          typeof execution.result_summary === "string" ? execution.result_summary : null,
        error: typeof execution.error === "string" ? execution.error : null,
      },
      result:
        candidate.result &&
        typeof candidate.result === "object" &&
        !Array.isArray(candidate.result)
          ? {
              status:
                (candidate.result as Record<string, unknown>).status === "completed"
                  ? "completed"
                  : "failed",
              result_summary:
                typeof (candidate.result as Record<string, unknown>).result_summary === "string"
                  ? ((candidate.result as Record<string, unknown>).result_summary as string)
                  : null,
              error:
                typeof (candidate.result as Record<string, unknown>).error === "string"
                  ? ((candidate.result as Record<string, unknown>).error as string)
                  : null,
            }
          : null,
    };
  }

  return null;
}

function buildApprovedToolNextActionAddendum(input: {
  toolKey: string;
  status: "completed" | "failed";
  resultSummary?: string | null;
  error?: string | null;
}): string {
  if (input.status === "completed") {
    return (
      `[NEXT ACTION COMPLETED] The approved "${input.toolKey}" action was already executed ` +
      `before this turn resumed. Result: ${input.resultSummary ?? "{\"success\":true}"}. ` +
      `Do NOT re-run this tool. Your ONLY job now is to confirm the outcome to the user ` +
      `in one brief, natural sentence. Examples: "Done, I removed that schedule." or ` +
      `"All set, that's taken care of." Do not narrate the approval process or mention ` +
      `that it was executed server-side.`
    );
  }

  return (
    `[NEXT ACTION FAILED] The approved "${input.toolKey}" action failed before this turn ` +
    `resumed. Do not retry "${input.toolKey}" automatically unless genuinely needed. ` +
    `The failure was: ${JSON.stringify(input.error ?? "Approved tool execution failed")}. ` +
    `Tell the user briefly what went wrong and suggest a next step.`
  );
}

export interface ApplyTenantRuntimeNextActionResult {
  run: TenantRuntimeRun;
  action: TenantRuntimeNextAction | null;
  systemPromptAddendum: string | null;
}

export async function applyQueuedTenantRuntimeNextAction(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  input: {
    actorId: string | null;
  }
): Promise<ApplyTenantRuntimeNextActionResult> {
  const action = parseTenantRuntimeNextAction(run.metadata.next_action);
  if (!action || action.state !== "queued") {
    return {
      run,
      action: null,
      systemPromptAddendum: null,
    };
  }

  if (action.kind !== "approved_tool_continuation") {
    return {
      run,
      action,
      systemPromptAddendum: null,
    };
  }

  let resultStatus: "completed" | "failed";
  let resultSummary: string | null = null;
  let resultError: string | null = null;

  if (action.execution.mode === "resume_invocation") {
    const outcome = await resumeTenantToolInvocationWithToken(admin, {
      run,
      continuationToken: action.execution.continuation_token,
      actorId: input.actorId,
    });

    if (outcome.outcome === "completed") {
      resultStatus = "completed";
      const toolOutput =
        outcome.result &&
        typeof outcome.result === "object" &&
        !Array.isArray(outcome.result)
          ? (outcome.result as Record<string, unknown>).tool_output
          : null;
      resultSummary = summarizeValue(toolOutput ?? outcome.result);
    } else {
      resultStatus = "failed";
      resultError = outcome.errorMessage ?? "Approved tool execution failed";
    }
  } else {
    resultStatus = action.execution.status;
    resultSummary = action.execution.result_summary ?? null;
    resultError = action.execution.error ?? null;
  }

  const patchedAction: TenantRuntimeApprovedToolNextAction = {
    ...action,
    state: "consumed",
    consumed_at: new Date().toISOString(),
    result: {
      status: resultStatus,
      result_summary: resultSummary,
      error: resultError,
    },
  };

  const patchedRun = await patchTenantRuntimeRunMetadata(admin, run, {
    next_action: patchedAction,
  });

  return {
    run: patchedRun,
    action: patchedAction,
    systemPromptAddendum: buildApprovedToolNextActionAddendum({
      toolKey: patchedAction.tool_key,
      status: resultStatus,
      resultSummary,
      error: resultError,
    }),
  };
}
