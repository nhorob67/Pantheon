import type { SupabaseClient } from "@supabase/supabase-js";

interface TokenUsage {
  tenantId: string;
  customerId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const COST_PER_MILLION_INPUT: Record<string, number> = {
  "claude-sonnet-4-5-20250514": 300,
};

const COST_PER_MILLION_OUTPUT: Record<string, number> = {
  "claude-sonnet-4-5-20250514": 1500,
};

function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const inputRate = COST_PER_MILLION_INPUT[model] ?? 300;
  const outputRate = COST_PER_MILLION_OUTPUT[model] ?? 1500;
  const cents = (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;
  return Math.ceil(cents);
}

export async function recordTokenUsage(
  admin: SupabaseClient,
  usage: TokenUsage
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const costCents = estimateCostCents(usage.model, usage.inputTokens, usage.outputTokens);

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
