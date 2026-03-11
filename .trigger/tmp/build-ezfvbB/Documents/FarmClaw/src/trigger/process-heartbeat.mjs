import {
  computeHeartbeatNextRunAt,
  executeHeartbeatForConfig,
  processRuntimeRun,
  resolveHeartbeatConfig
} from "../../../../chunk-IKFPJALX.mjs";
import "../../../../chunk-5R2YARHQ.mjs";
import "../../../../chunk-6FHKRVG7.mjs";
import "../../../../chunk-YHJ4RCX5.mjs";
import "../../../../chunk-5C7EBN2F.mjs";
import "../../../../chunk-FNDDZUO5.mjs";
import "../../../../chunk-XF5T4F7Q.mjs";
import "../../../../chunk-R2V4UDE3.mjs";
import "../../../../chunk-XSF42NVM.mjs";
import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  schedules_exports
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/process-heartbeat.ts
init_esm();

// src/lib/heartbeat/effective-configs.ts
init_esm();
function resolveEffectiveScheduledConfigs(configs) {
  const grouped = /* @__PURE__ */ new Map();
  for (const config of configs) {
    const group = grouped.get(config.tenant_id) || [];
    group.push(config);
    grouped.set(config.tenant_id, group);
  }
  const executable = [];
  const shadowedDefaults = [];
  for (const tenantConfigs of grouped.values()) {
    const enabledOverrides = tenantConfigs.filter(
      (config) => config.enabled && config.agent_id !== null
    );
    const defaults = tenantConfigs.filter((config) => config.agent_id === null);
    if (enabledOverrides.length > 0) {
      const enabledDefault = defaults.find((config) => config.enabled);
      if (enabledDefault) {
        executable.push({
          ...enabledDefault,
          effective_scope: "tenant_scoped_only"
        });
      }
      executable.push(
        ...enabledOverrides.map((config) => ({
          ...config,
          effective_scope: "agent_scoped_only"
        }))
      );
      continue;
    }
    executable.push(
      ...tenantConfigs.filter((config) => config.enabled).map((config) => ({
        ...config,
        effective_scope: config.agent_id ? "agent_scoped_only" : "all_checks"
      }))
    );
  }
  return { executable, shadowedDefaults };
}
__name(resolveEffectiveScheduledConfigs, "resolveEffectiveScheduledConfigs");

// src/trigger/process-heartbeat.ts
var processHeartbeat = schedules_exports.task({
  id: "process-heartbeat",
  cron: "*/1 * * * *",
  run: /* @__PURE__ */ __name(async () => {
    const admin = createTriggerAdminClient();
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    const { data: dueConfigs, error } = await admin.from("tenant_heartbeat_configs").select(
      "id, tenant_id, customer_id, agent_id, enabled, interval_minutes, timezone, active_hours_start, active_hours_end, checks, custom_checks, delivery_channel_id, cooldown_minutes, max_alerts_per_day, digest_enabled, digest_window_minutes, reminder_interval_minutes, heartbeat_instructions, last_run_at, next_run_at"
    ).eq("enabled", true).lte("next_run_at", nowIso).limit(50);
    if (error || !dueConfigs?.length) {
      return { processed: 0, error: error?.message };
    }
    const resolvedConfigs = dueConfigs.map(resolveHeartbeatConfig);
    const { executable, shadowedDefaults } = resolveEffectiveScheduledConfigs(resolvedConfigs);
    for (const config of shadowedDefaults) {
      await admin.from("tenant_heartbeat_configs").update({
        next_run_at: computeHeartbeatNextRunAt(config.interval_minutes, now)
      }).eq("id", config.id);
    }
    const results = [];
    for (const config of executable) {
      const result = await executeHeartbeatForConfig({
        admin,
        config,
        triggerMode: "scheduled",
        now,
        requestTraceId: crypto.randomUUID(),
        respectActiveHours: true,
        updateSchedule: true
      });
      if (result.runtimeRunId) {
        await processRuntimeRun.trigger({ runId: result.runtimeRunId });
      }
      results.push({
        configId: result.configId,
        hadSignal: result.hadSignal,
        runId: result.runtimeRunId,
        status: result.status
      });
    }
    return { processed: results.length, results };
  }, "run")
});
export {
  processHeartbeat
};
//# sourceMappingURL=process-heartbeat.mjs.map
