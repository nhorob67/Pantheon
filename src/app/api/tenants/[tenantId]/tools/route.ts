import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const paramsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list tools",
    },
    async (state) => {
      const { data: tools, error } = await state.admin
        .from("tenant_tools")
        .select(
          "id, tool_key, display_name, description, status, risk_level, metadata, tenant_tool_policies(approval_mode, allow_roles, max_calls_per_hour, timeout_ms)"
        )
        .eq("tenant_id", state.tenantContext.tenantId)
        .order("tool_key", { ascending: true });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch tools" },
          { status: 500 }
        );
      }

      const normalized = (tools ?? []).map((t) => ({
        ...t,
        policy: Array.isArray(t.tenant_tool_policies)
          ? t.tenant_tool_policies[0] ?? null
          : t.tenant_tool_policies ?? null,
        tenant_tool_policies: undefined,
      }));

      // Also load guardrail config
      const { data: guardrailRow } = await state.admin
        .from("tenant_run_budget_configs")
        .select(
          "loop_warning_threshold, loop_hard_stop_threshold, max_tool_invocations, max_elapsed_ms, max_tokens, max_spend_cents"
        )
        .eq("tenant_id", state.tenantContext.tenantId)
        .is("agent_id", null)
        .maybeSingle();

      return NextResponse.json({
        tools: normalized,
        guardrail_config: guardrailRow ?? null,
      });
    }
  );
}
