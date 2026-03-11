import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  schedules_exports,
  task
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/sync-model-catalog.ts
init_esm();

// src/lib/ai/catalog-sync.ts
init_esm();
async function fetchAnthropicModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    signal: AbortSignal.timeout(1e4)
  });
  if (!res.ok) return [];
  const body = await res.json();
  const models = body.data || [];
  return models.map((m) => ({
    id: String(m.id || ""),
    provider: "anthropic",
    display_name: String(m.display_name || m.id || ""),
    description: null,
    context_window: typeof m.context_window === "number" ? m.context_window : null,
    max_output_tokens: typeof m.max_output_tokens === "number" ? m.max_output_tokens : null,
    supports_vision: true,
    supports_tools: true,
    input_cost_per_million: 0,
    output_cost_per_million: 0,
    metadata: { raw: m }
  }));
}
__name(fetchAnthropicModels, "fetchAnthropicModels");
async function fetchOpenRouterModels() {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    signal: AbortSignal.timeout(1e4)
  });
  if (!res.ok) return [];
  const body = await res.json();
  const models = body.data || [];
  const anthropicModels = models.filter(
    (m) => String(m.id || "").startsWith("anthropic/")
  );
  return anthropicModels.map((m) => {
    const pricing = m.pricing || {};
    const inputPerToken = parseFloat(pricing.prompt || "0");
    const outputPerToken = parseFloat(pricing.completion || "0");
    return {
      id: String(m.id || ""),
      provider: "openrouter",
      display_name: String(m.name || m.id || ""),
      description: String(m.description || ""),
      context_window: typeof m.context_length === "number" ? m.context_length : null,
      max_output_tokens: typeof m.top_provider === "object" && m.top_provider ? typeof m.top_provider.max_completion_tokens === "number" ? m.top_provider.max_completion_tokens : null : null,
      supports_vision: Boolean(
        m.architecture && typeof m.architecture === "object" && m.architecture.modality === "multimodal"
      ),
      supports_tools: true,
      input_cost_per_million: Math.round(inputPerToken * 1e6 * 100),
      output_cost_per_million: Math.round(outputPerToken * 1e6 * 100),
      metadata: { raw_id: m.id }
    };
  });
}
__name(fetchOpenRouterModels, "fetchOpenRouterModels");
async function syncModelCatalog(admin, provider) {
  const result = {
    models_fetched: 0,
    models_added: 0,
    models_updated: 0,
    error: null
  };
  try {
    const entries = provider === "anthropic" ? await fetchAnthropicModels() : await fetchOpenRouterModels();
    result.models_fetched = entries.length;
    if (entries.length === 0) {
      await logSync(admin, provider, result);
      return result;
    }
    const { data: existing } = await admin.from("model_catalog").select("id").eq("provider", provider);
    const existingIds = new Set((existing || []).map((r) => r.id));
    for (const entry of entries) {
      if (!entry.id) continue;
      const row = {
        id: entry.id,
        provider: entry.provider,
        display_name: entry.display_name,
        description: entry.description,
        context_window: entry.context_window,
        max_output_tokens: entry.max_output_tokens,
        supports_vision: entry.supports_vision,
        supports_tools: entry.supports_tools,
        input_cost_per_million: entry.input_cost_per_million,
        output_cost_per_million: entry.output_cost_per_million,
        metadata: entry.metadata,
        last_synced_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (existingIds.has(entry.id)) {
        const { id: _id, ...updateFields } = row;
        await admin.from("model_catalog").update(updateFields).eq("id", entry.id);
        result.models_updated++;
      } else {
        await admin.from("model_catalog").insert(row);
        result.models_added++;
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Unknown error";
  }
  await logSync(admin, provider, result);
  return result;
}
__name(syncModelCatalog, "syncModelCatalog");
async function logSync(admin, provider, result) {
  await admin.from("model_catalog_sync_log").insert({
    provider,
    models_fetched: result.models_fetched,
    models_added: result.models_added,
    models_updated: result.models_updated,
    error: result.error
  });
}
__name(logSync, "logSync");

// src/trigger/sync-model-catalog.ts
var syncModelCatalogScheduled = schedules_exports.task({
  id: "sync-model-catalog",
  cron: "0 6 * * *",
  retry: { maxAttempts: 2 },
  run: /* @__PURE__ */ __name(async () => {
    const admin = createTriggerAdminClient();
    const [anthropicResult, openrouterResult] = await Promise.all([
      syncModelCatalog(admin, "anthropic"),
      syncModelCatalog(admin, "openrouter")
    ]);
    return {
      anthropic: anthropicResult,
      openrouter: openrouterResult
    };
  }, "run")
});
var syncModelCatalogManual = task({
  id: "sync-model-catalog-manual",
  retry: { maxAttempts: 1 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const admin = createTriggerAdminClient();
    const provider = payload.provider;
    if (provider) {
      return { [provider]: await syncModelCatalog(admin, provider) };
    }
    const [anthropicResult, openrouterResult] = await Promise.all([
      syncModelCatalog(admin, "anthropic"),
      syncModelCatalog(admin, "openrouter")
    ]);
    return {
      anthropic: anthropicResult,
      openrouter: openrouterResult
    };
  }, "run")
});
export {
  syncModelCatalogManual,
  syncModelCatalogScheduled
};
//# sourceMappingURL=sync-model-catalog.mjs.map
