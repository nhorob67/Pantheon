import type { LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createModelFromCatalog } from "./model-registry";
import { DEFAULT_PRIMARY_MODEL_ID, DEFAULT_FAST_MODEL_ID, farmclawModel } from "./client";

export interface ResolvedModel {
  model: LanguageModel;
  modelId: string;
  provider: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

export interface ResolvedModels {
  primary: ResolvedModel;
  fast: ResolvedModel;
}

interface CacheEntry {
  models: ResolvedModels;
  expiresAt: number;
}

const MAX_CACHE_SIZE = 1000;
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function getCached(tenantId: string): ResolvedModels | null {
  const entry = cache.get(tenantId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(tenantId);
    return null;
  }
  return entry.models;
}

function setCache(tenantId: string, models: ResolvedModels): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(tenantId, { models, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Extract primary model defaults from optional ResolvedModels (shared by AI workers). */
export function resolveWorkerModels(rm?: ResolvedModels) {
  return {
    model: rm?.primary.model ?? farmclawModel,
    modelId: rm?.primary.modelId ?? DEFAULT_PRIMARY_MODEL_ID,
    inputCost: rm?.primary.inputCostPerMillion,
    outputCost: rm?.primary.outputCostPerMillion,
    fastModel: rm?.fast.model,
  };
}

const SYSTEM_DEFAULTS = {
  primary: {
    id: DEFAULT_PRIMARY_MODEL_ID,
    provider: "anthropic",
    input_cost_per_million: 300,
    output_cost_per_million: 1500,
  },
  fast: {
    id: DEFAULT_FAST_MODEL_ID,
    provider: "anthropic",
    input_cost_per_million: 100,
    output_cost_per_million: 500,
  },
};

function buildResolvedModel(entry: {
  id: string;
  provider: string;
  input_cost_per_million: number;
  output_cost_per_million: number;
}): ResolvedModel {
  return {
    model: createModelFromCatalog({ id: entry.id, provider: entry.provider }),
    modelId: entry.id,
    provider: entry.provider,
    inputCostPerMillion: entry.input_cost_per_million,
    outputCostPerMillion: entry.output_cost_per_million,
  };
}

function buildDefaults(): ResolvedModels {
  return {
    primary: buildResolvedModel(SYSTEM_DEFAULTS.primary),
    fast: buildResolvedModel(SYSTEM_DEFAULTS.fast),
  };
}

export async function resolveModels(
  admin: SupabaseClient,
  tenantId: string
): Promise<ResolvedModels> {
  const cached = getCached(tenantId);
  if (cached) return cached;

  const { data: pref } = await admin
    .from("tenant_model_preferences")
    .select("primary_model_id, fast_model_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!pref?.primary_model_id && !pref?.fast_model_id) {
    const defaults = buildDefaults();
    setCache(tenantId, defaults);
    return defaults;
  }

  const modelIds = [
    pref.primary_model_id,
    pref.fast_model_id,
  ].filter(Boolean) as string[];

  const { data: catalogRows } = await admin
    .from("model_catalog")
    .select("id, provider, input_cost_per_million, output_cost_per_million, is_approved")
    .in("id", modelIds);

  const catalogMap = new Map(
    (catalogRows || []).map((r) => [r.id, r])
  );

  const primaryEntry = pref.primary_model_id
    ? catalogMap.get(pref.primary_model_id)
    : null;
  const fastEntry = pref.fast_model_id
    ? catalogMap.get(pref.fast_model_id)
    : null;

  const resolved: ResolvedModels = {
    primary:
      primaryEntry && primaryEntry.is_approved
        ? buildResolvedModel(primaryEntry)
        : buildResolvedModel(SYSTEM_DEFAULTS.primary),
    fast:
      fastEntry && fastEntry.is_approved
        ? buildResolvedModel(fastEntry)
        : buildResolvedModel(SYSTEM_DEFAULTS.fast),
  };

  setCache(tenantId, resolved);
  return resolved;
}
