import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  toolId: z.uuid(),
});

const patchSchema = z.object({
  status: z.enum(["enabled", "disabled"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; toolId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid parameters",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for tool management",
      fallbackErrorMessage: "Failed to update tool",
    },
    async (state) => {
      const limited = await consumeConfigUpdateRateLimit(state.tenantContext.customerId);
      if (limited) {
        return NextResponse.json(
          { error: "Rate limited. Try again shortly." },
          { status: 429 }
        );
      }

      const body = await request.json();
      const parsed = patchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 }
        );
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (parsed.data.status) {
        updates.status = parsed.data.status;
      }

      const { data, error } = await state.admin
        .from("tenant_tools")
        .update(updates)
        .eq("id", parsedParams.data.toolId)
        .eq("tenant_id", state.tenantContext.tenantId)
        .select("id, tool_key, status")
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Tool not found or update failed" },
          { status: 404 }
        );
      }

      return NextResponse.json({ tool: data });
    }
  );
}
