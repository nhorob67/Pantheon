import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";

const paramsSchema = z.object({ tenantId: z.uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load cost tips",
    },
    async ({ admin, tenantContext }) => {
      // Get the tenant's customer_id
      const { data: tenant } = await admin
        .from("tenants")
        .select("customer_id")
        .eq("id", tenantContext.tenantId)
        .single();

      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }

      // Get usage from the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usage } = await admin
        .from("api_usage")
        .select("input_tokens, output_tokens, estimated_cost_cents")
        .eq("customer_id", tenant.customer_id)
        .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));

      const totalInputTokens = (usage || []).reduce((sum, r) => sum + (r.input_tokens || 0), 0);
      const totalOutputTokens = (usage || []).reduce((sum, r) => sum + (r.output_tokens || 0), 0);
      const currentCostCents = (usage || []).reduce((sum, r) => sum + (r.estimated_cost_cents || 0), 0);

      if (totalInputTokens === 0 && totalOutputTokens === 0) {
        return NextResponse.json({
          has_usage: false,
          message: "Not enough usage data yet for cost estimates",
          projections: [],
        });
      }

      // Get approved models
      const { data: catalog } = await admin
        .from("model_catalog")
        .select("id, display_name, provider, input_cost_per_million, output_cost_per_million")
        .eq("is_approved", true);

      const projections = (catalog || []).map((model) => {
        const projectedCostCents = Math.ceil(
          (totalInputTokens * model.input_cost_per_million +
            totalOutputTokens * model.output_cost_per_million) /
            1_000_000
        );

        const savingsCents = currentCostCents - projectedCostCents;
        const savingsPercent =
          currentCostCents > 0
            ? Math.round((savingsCents / currentCostCents) * 100)
            : 0;

        return {
          model_id: model.id,
          display_name: model.display_name,
          provider: model.provider,
          projected_cost_cents: projectedCostCents,
          savings_cents: savingsCents,
          savings_percent: savingsPercent,
        };
      });

      return NextResponse.json({
        has_usage: true,
        current_cost_cents: currentCostCents,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        period_days: 30,
        projections,
      });
    }
  );
}
