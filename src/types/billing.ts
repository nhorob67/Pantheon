export interface UsageSummary {
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_cents: number;
}

export interface UsageByDay {
  date: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_cents: number;
}

export interface CostBreakdown {
  subscription_cents: number;
  api_usage_cents: number;
  total_cents: number;
  period_start: string;
  period_end: string;
}
