import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { generateDailyLog } from "@/lib/ai/daily-log-generator";

const BATCH_SIZE = 10;

export const generateDailyLogs = schedules.task({
  id: "generate-daily-logs",
  cron: "5 0 * * *", // 00:05 UTC daily
  run: async () => {
    const admin = createTriggerAdminClient();

    // Yesterday's date in YYYY-MM-DD format
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    // Query active tenants with auto_checkpoint enabled
    const { data: settings, error } = await admin
      .from("tenant_memory_settings_v")
      .select("tenant_id, customer_id")
      .eq("auto_checkpoint", true);

    if (error || !settings?.length) {
      return { processed: 0, date: dateStr, error: error?.message };
    }

    let processed = 0;
    let skipped = 0;

    // Process in batches to avoid API overload
    for (let i = 0; i < settings.length; i += BATCH_SIZE) {
      const batch = settings.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((s) =>
          generateDailyLog(admin, s.tenant_id, s.customer_id, dateStr)
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.written) {
          processed++;
        } else {
          skipped++;
        }
      }
    }

    return { processed, skipped, date: dateStr, totalTenants: settings.length };
  },
});
