import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PRIMARY_MODEL_ID, DEFAULT_FAST_MODEL_ID } from "./client";

export interface TokenUsage {
  tenantId: string;
  customerId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
}

const FALLBACK_COST_INPUT: Record<string, number> = {
  [DEFAULT_PRIMARY_MODEL_ID]: 300,
  [DEFAULT_FAST_MODEL_ID]: 100,
};

const FALLBACK_COST_OUTPUT: Record<string, number> = {
  [DEFAULT_PRIMARY_MODEL_ID]: 1500,
  [DEFAULT_FAST_MODEL_ID]: 500,
};

export function estimateTokenUsageCostCents(
  usage: Pick<
    TokenUsage,
    "model" | "inputTokens" | "outputTokens" | "inputCostPerMillion" | "outputCostPerMillion"
  >
): number {
  const inputRate = usage.inputCostPerMillion ?? FALLBACK_COST_INPUT[usage.model] ?? 300;
  const outputRate = usage.outputCostPerMillion ?? FALLBACK_COST_OUTPUT[usage.model] ?? 1500;
  const cents = (usage.inputTokens * inputRate + usage.outputTokens * outputRate) / 1_000_000;
  return Math.ceil(cents);
}

export async function recordTokenUsage(
  admin: SupabaseClient,
  usage: TokenUsage
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const costCents = estimateTokenUsageCostCents(usage);

  const { error } = await admin.rpc("upsert_api_usage", {
    p_customer_id: usage.customerId,
    p_date: today,
    p_model: usage.model,
    p_input_tokens: usage.inputTokens,
    p_output_tokens: usage.outputTokens,
    p_estimated_cost_cents: costCents,
  });

  if (error) {
    // Fallback: try direct upsert if RPC doesn't exist
    const { error: upsertError } = await admin
      .from("api_usage")
      .upsert(
        {
          customer_id: usage.customerId,
          date: today,
          model: usage.model,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          estimated_cost_cents: costCents,
        },
        { onConflict: "customer_id,date,model" }
      );

    if (upsertError) {
      console.error("[usage-tracker] Failed to record token usage:", upsertError.message);
    }
  }
}

/**
 * Record browser session cost. Uses model name "browser_session" in api_usage.
 */
export async function recordBrowserSessionCost(
  admin: SupabaseClient,
  customerId: string,
  costCents: number
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await admin.rpc("upsert_api_usage", {
    p_customer_id: customerId,
    p_date: today,
    p_model: "browser_session",
    p_input_tokens: 0,
    p_output_tokens: 0,
    p_estimated_cost_cents: costCents,
  });

  if (error) {
    console.error("[usage-tracker] Failed to record browser session cost:", error.message);
  }
}
