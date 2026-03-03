import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { memoryOperationRequestSchema } from "@/lib/validators/memory";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  buildTenantMemoryContext,
  queueTenantMemoryOperation,
} from "@/lib/runtime/tenant-memory";

const tenantMemoryCheckpointRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantMemoryCheckpointRouteParamsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) {
    return parsedParams;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for tenant memory operation",
      fallbackErrorMessage: "Failed to queue tenant memory checkpoint",
    },
    async (state) => {
      if (state.runtimeGates.memory_writes_paused) {
        return NextResponse.json(
          { error: "Tenant runtime memory writes are currently paused" },
          { status: 409 }
        );
      }

      const rateLimit = await consumeConfigUpdateRateLimit(state.user.id);
      if (rateLimit === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }

      if (rateLimit === "blocked") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = memoryOperationRequestSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const context = buildTenantMemoryContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const operation = await queueTenantMemoryOperation(
        state.admin,
        context,
        "checkpoint",
        state.user.email || state.user.id,
        parsedBody.data.reason
      );

      const responseBody: Record<string, unknown> = {
        operation,
        legacy_instance_id: mapping.instanceId,
      };

      if (mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for memory checkpoint.";
      }

      return NextResponse.json(responseBody, { status: 202 });
    }
  );
}
