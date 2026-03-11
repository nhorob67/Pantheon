import {
  computeNextRun,
  decrypt,
  processRuntimeRun,
  sendDiscordChannelMessage
} from "../../../../chunk-IKFPJALX.mjs";
import "../../../../chunk-5R2YARHQ.mjs";
import "../../../../chunk-6FHKRVG7.mjs";
import "../../../../chunk-YHJ4RCX5.mjs";
import {
  enqueueDiscordRuntimeRun
} from "../../../../chunk-5C7EBN2F.mjs";
import "../../../../chunk-FNDDZUO5.mjs";
import "../../../../chunk-XF5T4F7Q.mjs";
import {
  safeErrorMessage
} from "../../../../chunk-R2V4UDE3.mjs";
import "../../../../chunk-XSF42NVM.mjs";
import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  schedules_exports,
  wait
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/process-cron-schedules.ts
init_esm();

// src/lib/schedules/cron-failure-notifier.ts
init_esm();

// src/lib/channel-token.ts
init_esm();
function getDiscordTokenFromChannelConfig(channelConfig) {
  const config = channelConfig ?? {};
  if (typeof config.token === "string" && config.token.length > 0) {
    throw new Error(
      "Plaintext Discord token detected in channel_config. Run `npx tsx scripts/migrate-plaintext-tokens.ts` to encrypt all tokens, then remove the plaintext 'token' key."
    );
  }
  if (typeof config.token_encrypted === "string" && config.token_encrypted.length > 0) {
    try {
      return decrypt(config.token_encrypted);
    } catch {
      throw new Error("Failed to decrypt Discord token");
    }
  }
  throw new Error("Discord token is missing from instance channel configuration");
}
__name(getDiscordTokenFromChannelConfig, "getDiscordTokenFromChannelConfig");

// src/lib/runtime/tenant-agents.ts
init_esm();

// src/lib/schedules/sync-predefined-schedules.ts
init_esm();

// src/lib/runtime/tenant-agents.ts
var TenantAgentServiceError = class extends Error {
  static {
    __name(this, "TenantAgentServiceError");
  }
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
};
async function resolveCanonicalLegacyInstanceForTenant(admin, tenantId) {
  const { data, error } = await admin.from("instance_tenant_mappings").select("instance_id").eq("tenant_id", tenantId).eq("mapping_status", "active").order("updated_at", { ascending: false }).limit(2);
  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve legacy instance mapping for tenant")
    );
  }
  const mappings = data || [];
  if (mappings.length === 0) {
    return { instanceId: null, ambiguous: false };
  }
  return {
    instanceId: mappings[0].instance_id,
    ambiguous: mappings.length > 1
  };
}
__name(resolveCanonicalLegacyInstanceForTenant, "resolveCanonicalLegacyInstanceForTenant");

// src/lib/schedules/cron-failure-notifier.ts
var NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1e3;
var recentNotifications = /* @__PURE__ */ new Map();
async function sendCronFailureNotification(admin, input) {
  const cacheKey = `${input.tenantId}:${input.channelId}:${input.scheduleName}`;
  const lastSent = recentNotifications.get(cacheKey);
  if (lastSent && Date.now() - lastSent < NOTIFICATION_COOLDOWN_MS) {
    return { sent: false, reason: "rate_limited" };
  }
  let botToken;
  try {
    const mapping = await resolveCanonicalLegacyInstanceForTenant(admin, input.tenantId);
    if (!mapping.instanceId) {
      return { sent: false, reason: "no_instance_mapping" };
    }
    const { data } = await admin.from("instances").select("id, channel_config").eq("id", mapping.instanceId).maybeSingle();
    if (!data) {
      return { sent: false, reason: "no_instance_config" };
    }
    botToken = getDiscordTokenFromChannelConfig(
      data.channel_config
    );
  } catch {
    return { sent: false, reason: "token_resolution_failed" };
  }
  const retryInfo = input.maxRetries > 0 ? ` (failed after ${input.retryAttempt + 1}/${input.maxRetries + 1} attempts)` : "";
  const message = [
    `**Schedule Failed:** ${input.scheduleName}${retryInfo}`,
    `> ${input.errorMessage.slice(0, 200)}`,
    "",
    "Check your schedule activity in the dashboard for details."
  ].join("\n");
  try {
    await sendDiscordChannelMessage({
      botToken,
      channelId: input.channelId,
      content: message
    });
    recentNotifications.set(cacheKey, Date.now());
    return { sent: true };
  } catch {
    return { sent: false, reason: "discord_send_failed" };
  }
}
__name(sendCronFailureNotification, "sendCronFailureNotification");

// src/trigger/process-cron-schedules.ts
var processCronSchedules = schedules_exports.task({
  id: "process-cron-schedules",
  cron: "*/1 * * * *",
  run: /* @__PURE__ */ __name(async () => {
    const admin = createTriggerAdminClient();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { data: dueSchedules, error } = await admin.from("tenant_scheduled_messages").select(
      "id, tenant_id, customer_id, schedule_key, channel_id, agent_id, cron_expression, timezone, metadata, schedule_type, prompt, tools, display_name, notify_on_failure, max_retries, retry_delay_seconds"
    ).eq("enabled", true).lte("next_run_at", now).limit(50);
    if (error || !dueSchedules?.length) {
      return { processed: 0, error: error?.message };
    }
    const results = [];
    for (const rawSchedule of dueSchedules) {
      const schedule = rawSchedule;
      const metadata = schedule.metadata || {};
      const scheduleType = schedule.schedule_type || "predefined";
      const customPrompt = typeof schedule.prompt === "string" ? schedule.prompt : null;
      const customTools = Array.isArray(schedule.tools) ? schedule.tools : [];
      const maxRetries = schedule.max_retries ?? 2;
      const retryDelay = schedule.retry_delay_seconds ?? 60;
      const scheduleName = schedule.display_name || schedule.schedule_key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      let lastRunId = "";
      let lastOutcome = "failed";
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const run = await enqueueDiscordRuntimeRun(admin, {
          runKind: "discord_runtime",
          tenantId: schedule.tenant_id,
          customerId: schedule.customer_id,
          requestTraceId: crypto.randomUUID(),
          idempotencyKey: `cron:${schedule.id}:${now.slice(0, 16)}:attempt${attempt}`,
          payload: {
            channel_id: schedule.channel_id,
            content: `[cron] ${schedule.schedule_key}`,
            user_id: "system",
            guild_id: null,
            message_id: `cron-${schedule.id}-${Date.now()}`,
            run_kind: "discord_cron",
            schedule_key: schedule.schedule_key,
            schedule_type: scheduleType,
            custom_prompt: customPrompt,
            custom_tools: customTools.length > 0 ? customTools : null,
            briefing_sections: metadata.briefing_sections ?? null
          },
          metadata: {
            cron_schedule_id: schedule.id,
            cron_expression: schedule.cron_expression,
            retry_attempt: attempt
          }
        });
        lastRunId = run.id;
        await processRuntimeRun.trigger({ runId: run.id });
        const { data: completedRun } = await admin.from("tenant_runtime_runs").select("status, error_message").eq("id", run.id).maybeSingle();
        if (completedRun?.status === "completed") {
          lastOutcome = "completed";
          break;
        }
        if (attempt < maxRetries) {
          await wait.for({ seconds: retryDelay });
          continue;
        }
        lastOutcome = "failed";
        if (schedule.notify_on_failure) {
          const errorMsg = completedRun?.error_message || "Unknown error";
          const notification = await sendCronFailureNotification(admin, {
            tenantId: schedule.tenant_id,
            channelId: schedule.channel_id,
            scheduleName,
            errorMessage: errorMsg,
            retryAttempt: attempt,
            maxRetries
          });
          results.push({
            scheduleId: schedule.id,
            runId: lastRunId,
            retryAttempt: attempt,
            outcome: lastOutcome,
            notificationSent: notification.sent
          });
        }
      }
      const timezone = schedule.timezone || "America/Chicago";
      const nextRun = computeNextRun(schedule.cron_expression, timezone);
      await admin.from("tenant_scheduled_messages").update({
        last_run_at: now,
        next_run_at: nextRun
      }).eq("id", schedule.id);
      if (!results.find((r) => r.scheduleId === schedule.id)) {
        results.push({
          scheduleId: schedule.id,
          runId: lastRunId,
          retryAttempt: 0,
          outcome: lastOutcome
        });
      }
    }
    return { processed: results.length, runs: results };
  }, "run")
});
export {
  processCronSchedules
};
//# sourceMappingURL=process-cron-schedules.mjs.map
