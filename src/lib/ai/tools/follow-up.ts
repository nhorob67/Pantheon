import { z } from "zod";
import { tool, type Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { processRuntimeRun } from "@/trigger/process-runtime-run";
import {
  getObligationByRunId,
  isRuntimeObligationsEnabled,
  onFollowUpScheduledForRunId,
} from "@/lib/runtime/obligation-coordinator";

// ---------------------------------------------------------------------------
// Constants (exported for shared use by safety net)
// ---------------------------------------------------------------------------

export const MAX_FOLLOW_UP_DEPTH = 10;
export const MAX_PENDING_FOLLOW_UPS_PER_TENANT = 3;
const MIN_DELAY_MINUTES = 1;
const MAX_DELAY_MINUTES = 60;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface FollowUpToolConfig {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string;
  channelId: string;
  messageId?: string | null;
  runId: string;
  followUpDepth: number;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createFollowUpTool(
  config: FollowUpToolConfig
): Record<string, Tool> {
  return {
    task_follow_up: tool({
      description:
        "Schedule a delayed follow-up message to continue working on a task later. Use this when a task can't be completed in the current interaction — for example, when waiting for external results, needing more research time, or monitoring something over time. You'll be re-invoked after the delay with the context you provide.",
      inputSchema: z.object({
        task_summary: z
          .string()
          .describe(
            "What you're working on and what remains to be done. Be specific so your future self can pick up where you left off."
          ),
        delay_minutes: z
          .number()
          .min(MIN_DELAY_MINUTES)
          .max(MAX_DELAY_MINUTES)
          .describe(
            `How many minutes to wait before following up (${MIN_DELAY_MINUTES}–${MAX_DELAY_MINUTES}).`
          ),
        reason: z
          .string()
          .describe(
            "Why a follow-up is needed (e.g. 'waiting for API response', 'need to check results')."
          ),
      }),
      execute: async ({ task_summary, delay_minutes, reason }) => {
        // Guard: max chain depth
        if (config.followUpDepth >= MAX_FOLLOW_UP_DEPTH) {
          return {
            error:
              "Maximum follow-up chain depth reached. Summarize what you've accomplished and let the user know you can't continue automatically.",
          };
        }

        // Guard: max pending follow-ups per tenant
        const { count } = await config.admin
          .from("tenant_runtime_runs")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", config.tenantId)
          .eq("run_kind", "discord_follow_up")
          .in("status", ["queued"]);

        if ((count ?? 0) >= MAX_PENDING_FOLLOW_UPS_PER_TENANT) {
          return {
            error: `There are already ${count} pending follow-ups for this team. Wait for some to complete before scheduling more.`,
          };
        }

        const idempotencyKey = `follow_up:${config.runId}:${Date.now()}`;
        const scheduledFor = new Date(
          Date.now() + delay_minutes * 60 * 1000
        ).toISOString();
        const obligationsEnabled = await isRuntimeObligationsEnabled(
          config.admin,
          config.customerId
        );
        const parentObligation = obligationsEnabled
          ? await getObligationByRunId(config.admin, config.runId).catch(() => null)
          : null;

        const childRun = await enqueueDiscordRuntimeRun(config.admin, {
          tenantId: config.tenantId,
          customerId: config.customerId,
          requestTraceId: `follow-up-${config.runId}`,
          idempotencyKey,
          runKind: "discord_follow_up",
          payload: {
            channel_id: config.channelId,
            message_id: config.messageId ?? null,
            agent_id: config.agentId,
            task_summary,
            reason,
            follow_up_depth: config.followUpDepth + 1,
            run_kind: "discord_follow_up",
          },
          metadata: {
            follow_up_depth: config.followUpDepth + 1,
            scheduled_for: scheduledFor,
            originating_run_id: config.runId,
            obligation_id: parentObligation?.id ?? null,
            lifecycle_channel_id: config.channelId,
            lifecycle_reply_to_message_id: config.messageId ?? null,
          },
        });

        if (parentObligation) {
          await onFollowUpScheduledForRunId(
            config.admin,
            config.customerId,
            config.runId,
            childRun.id
          ).catch(() => {});
        }

        await processRuntimeRun.trigger(
          { runId: childRun.id },
          { delay: `${delay_minutes}m` }
        );

        return {
          success: true,
          message: `Follow-up scheduled in ${delay_minutes} minutes.`,
          scheduled_for: scheduledFor,
        };
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Shared follow-up scheduling helper (used by both tool and safety net)
// ---------------------------------------------------------------------------

export interface ScheduleFollowUpInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string;
  channelId: string;
  messageId?: string | null;
  runId: string;
  followUpDepth: number;
  taskSummary: string;
  reason: string;
  delayMinutes: number;
}

export async function scheduleFollowUp(
  input: ScheduleFollowUpInput
): Promise<{ success: boolean; reason?: string }> {
  // Guard: max chain depth
  if (input.followUpDepth >= MAX_FOLLOW_UP_DEPTH) {
    return { success: false, reason: "max_depth_reached" };
  }

  // Guard: max pending follow-ups per tenant
  const { count } = await input.admin
    .from("tenant_runtime_runs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", input.tenantId)
    .eq("run_kind", "discord_follow_up")
    .in("status", ["queued"]);

  if ((count ?? 0) >= MAX_PENDING_FOLLOW_UPS_PER_TENANT) {
    return { success: false, reason: "max_pending_reached" };
  }

  const delayMinutes = Math.max(MIN_DELAY_MINUTES, Math.min(MAX_DELAY_MINUTES, input.delayMinutes));
  const idempotencyKey = `follow_up:${input.runId}:${Date.now()}`;
  const scheduledFor = new Date(
    Date.now() + delayMinutes * 60 * 1000
  ).toISOString();
  const obligationsEnabled = await isRuntimeObligationsEnabled(
    input.admin,
    input.customerId
  );
  const parentObligation = obligationsEnabled
    ? await getObligationByRunId(input.admin, input.runId).catch(() => null)
    : null;

  const childRun = await enqueueDiscordRuntimeRun(input.admin, {
    tenantId: input.tenantId,
    customerId: input.customerId,
    requestTraceId: `follow-up-${input.runId}`,
    idempotencyKey,
    runKind: "discord_follow_up",
    payload: {
      channel_id: input.channelId,
      message_id: input.messageId ?? null,
      agent_id: input.agentId,
      task_summary: input.taskSummary,
      reason: input.reason,
      follow_up_depth: input.followUpDepth + 1,
      run_kind: "discord_follow_up",
    },
    metadata: {
      follow_up_depth: input.followUpDepth + 1,
      scheduled_for: scheduledFor,
      originating_run_id: input.runId,
      obligation_id: parentObligation?.id ?? null,
      lifecycle_channel_id: input.channelId,
      lifecycle_reply_to_message_id: input.messageId ?? null,
    },
  });

  if (parentObligation) {
    await onFollowUpScheduledForRunId(
      input.admin,
      input.customerId,
      input.runId,
      childRun.id
    ).catch(() => {});
  }

  await processRuntimeRun.trigger(
    { runId: childRun.id },
    { delay: `${delayMinutes}m` }
  );

  return { success: true };
}
