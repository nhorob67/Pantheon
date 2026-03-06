import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { updateModelPreferencesSchema } from "@/lib/validators/model-preferences";

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
      fallbackErrorMessage: "Failed to load model preferences",
    },
    async ({ admin, tenantContext }) => {
      const [{ data: preferences }, { data: catalog }] = await Promise.all([
        admin
          .from("tenant_model_preferences")
          .select("primary_model_id, fast_model_id, updated_at")
          .eq("tenant_id", tenantContext.tenantId)
          .maybeSingle(),
        admin
          .from("model_catalog")
          .select("id, provider, display_name, description, context_window, max_output_tokens, supports_vision, supports_tools, input_cost_per_million, output_cost_per_million, tier_hint")
          .eq("is_approved", true)
          .order("provider")
          .order("display_name"),
      ]);

      return NextResponse.json({
        preferences: preferences || { primary_model_id: null, fast_model_id: null },
        catalog: catalog || [],
      });
    }
  );
}

export async function PUT(
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
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to update model preferences",
    },
    async ({ admin, tenantContext, user }) => {
      const body = await request.json();
      const result = updateModelPreferencesSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid data", details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { primary_model_id, fast_model_id } = result.data;

      // Validate selected models are approved
      const modelIds = [primary_model_id, fast_model_id].filter(Boolean) as string[];
      if (modelIds.length > 0) {
        const { data: approved } = await admin
          .from("model_catalog")
          .select("id")
          .in("id", modelIds)
          .eq("is_approved", true);

        const approvedIds = new Set((approved || []).map((r) => r.id));
        if (primary_model_id && !approvedIds.has(primary_model_id)) {
          return NextResponse.json(
            { error: "Selected primary model is not approved" },
            { status: 400 }
          );
        }
        if (fast_model_id && !approvedIds.has(fast_model_id)) {
          return NextResponse.json(
            { error: "Selected fast model is not approved" },
            { status: 400 }
          );
        }
      }

      const { error } = await admin
        .from("tenant_model_preferences")
        .upsert(
          {
            tenant_id: tenantContext.tenantId,
            primary_model_id,
            fast_model_id,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: "tenant_id" }
        );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }
  );
}
