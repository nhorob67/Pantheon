import { schedules, task } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { syncModelCatalog } from "@/lib/ai/catalog-sync";

export const syncModelCatalogScheduled = schedules.task({
  id: "sync-model-catalog",
  cron: "0 6 * * *",
  retry: { maxAttempts: 2 },
  run: async () => {
    const admin = createTriggerAdminClient();

    const [anthropicResult, openrouterResult] = await Promise.all([
      syncModelCatalog(admin, "anthropic"),
      syncModelCatalog(admin, "openrouter"),
    ]);

    return {
      anthropic: anthropicResult,
      openrouter: openrouterResult,
    };
  },
});

export const syncModelCatalogManual = task({
  id: "sync-model-catalog-manual",
  retry: { maxAttempts: 1 },
  run: async (payload: { provider?: "anthropic" | "openrouter" }) => {
    const admin = createTriggerAdminClient();
    const provider = payload.provider;

    if (provider) {
      return { [provider]: await syncModelCatalog(admin, provider) };
    }

    const [anthropicResult, openrouterResult] = await Promise.all([
      syncModelCatalog(admin, "anthropic"),
      syncModelCatalog(admin, "openrouter"),
    ]);

    return {
      anthropic: anthropicResult,
      openrouter: openrouterResult,
    };
  },
});
