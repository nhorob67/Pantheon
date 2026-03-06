import type { SupabaseClient } from "@supabase/supabase-js";

interface CatalogEntry {
  id: string;
  provider: "anthropic" | "openrouter";
  display_name: string;
  description: string | null;
  context_window: number | null;
  max_output_tokens: number | null;
  supports_vision: boolean;
  supports_tools: boolean;
  input_cost_per_million: number;
  output_cost_per_million: number;
  metadata: Record<string, unknown>;
}

interface SyncResult {
  models_fetched: number;
  models_added: number;
  models_updated: number;
  error: string | null;
}

export async function fetchAnthropicModels(): Promise<CatalogEntry[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return [];

  const body = (await res.json()) as { data?: Array<Record<string, unknown>> };
  const models = body.data || [];

  return models.map((m) => ({
    id: String(m.id || ""),
    provider: "anthropic" as const,
    display_name: String(m.display_name || m.id || ""),
    description: null,
    context_window: typeof m.context_window === "number" ? m.context_window : null,
    max_output_tokens: typeof m.max_output_tokens === "number" ? m.max_output_tokens : null,
    supports_vision: true,
    supports_tools: true,
    input_cost_per_million: 0,
    output_cost_per_million: 0,
    metadata: { raw: m },
  }));
}

export async function fetchOpenRouterModels(): Promise<CatalogEntry[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return [];

  const body = (await res.json()) as { data?: Array<Record<string, unknown>> };
  const models = body.data || [];

  // Only include Anthropic models from OpenRouter
  const anthropicModels = models.filter((m) =>
    String(m.id || "").startsWith("anthropic/")
  );

  return anthropicModels.map((m) => {
    const pricing = (m.pricing || {}) as Record<string, string>;
    // OpenRouter pricing is per token in dollars; convert to cents per million
    const inputPerToken = parseFloat(pricing.prompt || "0");
    const outputPerToken = parseFloat(pricing.completion || "0");

    return {
      id: String(m.id || ""),
      provider: "openrouter" as const,
      display_name: String(m.name || m.id || ""),
      description: String(m.description || ""),
      context_window: typeof m.context_length === "number" ? m.context_length : null,
      max_output_tokens: typeof m.top_provider === "object" && m.top_provider
        ? (typeof (m.top_provider as Record<string, unknown>).max_completion_tokens === "number"
            ? (m.top_provider as Record<string, unknown>).max_completion_tokens as number
            : null)
        : null,
      supports_vision: Boolean(
        m.architecture && typeof m.architecture === "object" &&
        (m.architecture as Record<string, unknown>).modality === "multimodal"
      ),
      supports_tools: true,
      input_cost_per_million: Math.round(inputPerToken * 1_000_000 * 100),
      output_cost_per_million: Math.round(outputPerToken * 1_000_000 * 100),
      metadata: { raw_id: m.id },
    };
  });
}

export async function syncModelCatalog(
  admin: SupabaseClient,
  provider: "anthropic" | "openrouter"
): Promise<SyncResult> {
  const result: SyncResult = {
    models_fetched: 0,
    models_added: 0,
    models_updated: 0,
    error: null,
  };

  try {
    const entries =
      provider === "anthropic"
        ? await fetchAnthropicModels()
        : await fetchOpenRouterModels();

    result.models_fetched = entries.length;

    if (entries.length === 0) {
      await logSync(admin, provider, result);
      return result;
    }

    // Get existing models for this provider
    const { data: existing } = await admin
      .from("model_catalog")
      .select("id")
      .eq("provider", provider);

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
        last_synced_at: new Date().toISOString(),
      };

      if (existingIds.has(entry.id)) {
        // Update but preserve is_approved
        const { id: _id, ...updateFields } = row;
        await admin
          .from("model_catalog")
          .update(updateFields)
          .eq("id", entry.id);
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

async function logSync(
  admin: SupabaseClient,
  provider: string,
  result: SyncResult
): Promise<void> {
  await admin.from("model_catalog_sync_log").insert({
    provider,
    models_fetched: result.models_fetched,
    models_added: result.models_added,
    models_updated: result.models_updated,
    error: result.error,
  });
}
