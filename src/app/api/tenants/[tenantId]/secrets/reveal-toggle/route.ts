import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const paramsSchema = z.object({
  tenantId: z.uuid(),
});

const bodySchema = z.object({
  enabled: z.boolean(),
});

export async function PUT(
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
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Only workspace owners can toggle break-glass access",
      fallbackErrorMessage: "Failed to toggle reveal_secret",
    },
    async (state) => {
      if (state.tenantContext.memberRole !== "owner") {
        return NextResponse.json(
          { error: "Only workspace owners can toggle break-glass access" },
          { status: 403 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const newStatus = parsed.data.enabled ? "enabled" : "disabled";

      const { error } = await state.admin
        .from("tenant_tools")
        .update({ status: newStatus })
        .eq("tenant_id", state.tenantContext.tenantId)
        .eq("tool_key", "reveal_secret");

      if (error) {
        return NextResponse.json(
          { error: "Failed to update reveal_secret status" },
          { status: 500 }
        );
      }

      return NextResponse.json({ status: newStatus });
    }
  );
}
