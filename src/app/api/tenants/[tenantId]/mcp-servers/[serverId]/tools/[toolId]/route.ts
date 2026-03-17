import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  serverId: z.uuid(),
  toolId: z.uuid(),
});

const updateSchema = z.object({
  blocked: z.boolean().optional(),
  risk_level_override: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
});

/**
 * PATCH: Update MCP tool settings (block/unblock, risk level override).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; serverId: string; toolId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid IDs",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for MCP tool management",
      fallbackErrorMessage: "Failed to update MCP tool",
    },
    async (state) => {
      const rateLimit = await consumeConfigUpdateRateLimit(state.user.id);
      if (rateLimit === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable." },
          { status: 503 }
        );
      }
      if (rateLimit === "blocked") {
        return NextResponse.json(
          { error: "Too many requests." },
          { status: 429 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = updateSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );

      // Verify the tool belongs to the correct server and tenant
      const { data: tool, error: toolError } = await state.admin
        .from("mcp_discovered_tools")
        .select("id, server_id, tenant_id")
        .eq("id", parsedParams.data.toolId)
        .eq("server_id", parsedParams.data.serverId)
        .eq("tenant_id", state.tenantContext.tenantId)
        .maybeSingle();

      if (toolError || !tool) {
        return NextResponse.json(
          { error: "MCP tool not found" },
          { status: 404 }
        );
      }

      const updatePayload: Record<string, unknown> = {};
      if (parsedBody.data.blocked !== undefined) {
        updatePayload.blocked = parsedBody.data.blocked;
      }
      if (parsedBody.data.risk_level_override !== undefined) {
        updatePayload.risk_level_override = parsedBody.data.risk_level_override;
      }

      const { data: updated, error: updateError } = await state.admin
        .from("mcp_discovered_tools")
        .update(updatePayload)
        .eq("id", parsedParams.data.toolId)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update tool" },
          { status: 500 }
        );
      }

      return NextResponse.json({ tool: updated });
    }
  );
}
