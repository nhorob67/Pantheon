import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CronExpressionParser } from "cron-parser";
import { computeNextRun } from "@/lib/schedules/compute-next-run";
import { describeCron } from "@/lib/schedules/cron-describe";

export function createScheduleTools(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  agentId: string,
  channelId: string,
  timezone: string
) {
  return {
    schedule_create: tool({
      description:
        "Create a recurring scheduled task. The farmer can ask things like 'remind me every Tuesday at 7am to check field moisture'. You should parse their request into a cron expression and generate a prompt.",
      inputSchema: z.object({
        display_name: z
          .string()
          .describe("Short name for the schedule, e.g. 'Check field moisture'"),
        prompt: z
          .string()
          .describe(
            "The instruction the agent follows when the schedule fires. Write it as a clear directive."
          ),
        cron_expression: z
          .string()
          .describe(
            "5-field cron expression (minute hour day-of-month month day-of-week). E.g. '0 7 * * 2' for every Tuesday at 7am."
          ),
        tools: z
          .array(z.string())
          .optional()
          .describe(
            "Optional list of skill slugs to scope this job. E.g. ['farm-weather']. Leave empty for no tool restriction."
          ),
      }),
      execute: async ({ display_name, prompt, cron_expression, tools }) => {
        // Validate cron expression
        try {
          CronExpressionParser.parse(cron_expression);
        } catch {
          return { error: `Invalid cron expression: ${cron_expression}` };
        }

        // Check custom schedule limit
        const { count } = await admin
          .from("tenant_scheduled_messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("schedule_type", "custom");

        if ((count ?? 0) >= 25) {
          return {
            error:
              "Maximum of 25 custom schedules reached. Delete an existing one first.",
          };
        }

        const scheduleKey = `custom_${crypto.randomUUID().slice(0, 8)}`;
        const nextRunAt = computeNextRun(cron_expression, timezone);

        const { data: created, error } = await admin
          .from("tenant_scheduled_messages")
          .insert({
            tenant_id: tenantId,
            customer_id: customerId,
            agent_id: agentId,
            channel_id: channelId,
            schedule_key: scheduleKey,
            cron_expression,
            timezone,
            enabled: true,
            next_run_at: nextRunAt,
            schedule_type: "custom",
            display_name,
            prompt,
            tools: tools || [],
            created_by: "discord_chat",
          })
          .select("id, display_name, cron_expression, next_run_at")
          .single();

        if (error) {
          return { error: `Failed to create schedule: ${error.message}` };
        }

        return {
          created: true,
          schedule: {
            id: created.id,
            name: created.display_name,
            frequency: describeCron(cron_expression),
            next_run: created.next_run_at,
          },
        };
      },
    }),

    schedule_list: tool({
      description:
        "List all active schedules for this farm. Shows predefined and custom scheduled tasks with their status.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data: schedules, error } = await admin
          .from("tenant_scheduled_messages")
          .select(
            "id, schedule_key, cron_expression, timezone, enabled, next_run_at, schedule_type, display_name, prompt, tools, created_by"
          )
          .eq("tenant_id", tenantId)
          .order("enabled", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          return { error: `Failed to list schedules: ${error.message}` };
        }

        return {
          schedules: (schedules || []).map((s) => ({
            id: s.id,
            name: s.display_name || s.schedule_key,
            type: s.schedule_type,
            frequency: describeCron(s.cron_expression),
            enabled: s.enabled,
            next_run: s.next_run_at,
            tools: s.tools || [],
            created_via: s.created_by,
          })),
          count: schedules?.length ?? 0,
        };
      },
    }),

    schedule_toggle: tool({
      description:
        "Enable or disable a schedule by its ID. Works for both predefined and custom schedules.",
      inputSchema: z.object({
        schedule_id: z.string().describe("The schedule ID to toggle"),
        enabled: z.boolean().describe("Whether to enable or disable the schedule"),
      }),
      execute: async ({ schedule_id, enabled }) => {
        const { data: existing, error: fetchError } = await admin
          .from("tenant_scheduled_messages")
          .select("id, cron_expression, timezone")
          .eq("id", schedule_id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (fetchError || !existing) {
          return { error: "Schedule not found" };
        }

        const nextRunAt = enabled
          ? computeNextRun(existing.cron_expression, existing.timezone)
          : null;

        const { error: updateError } = await admin
          .from("tenant_scheduled_messages")
          .update({
            enabled,
            next_run_at: nextRunAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", schedule_id);

        if (updateError) {
          return { error: `Failed to update schedule: ${updateError.message}` };
        }

        return { updated: true, enabled, next_run: nextRunAt };
      },
    }),

    schedule_delete: tool({
      description:
        "Delete a custom schedule by its ID. Predefined schedules cannot be deleted — use schedule_toggle to disable them instead.",
      inputSchema: z.object({
        schedule_id: z.string().describe("The schedule ID to delete"),
      }),
      execute: async ({ schedule_id }) => {
        const { data: existing, error: fetchError } = await admin
          .from("tenant_scheduled_messages")
          .select("id, schedule_type")
          .eq("id", schedule_id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (fetchError || !existing) {
          return { error: "Schedule not found" };
        }

        if (existing.schedule_type !== "custom") {
          return {
            error:
              "Predefined schedules cannot be deleted. Use schedule_toggle to disable it instead.",
          };
        }

        const { error: deleteError } = await admin
          .from("tenant_scheduled_messages")
          .delete()
          .eq("id", schedule_id);

        if (deleteError) {
          return { error: `Failed to delete schedule: ${deleteError.message}` };
        }

        return { deleted: true };
      },
    }),
  };
}
