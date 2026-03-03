import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { knowledgeUpdateSchema } from "@/lib/validators/knowledge";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  archiveTenantKnowledgeFile,
  buildTenantKnowledgeContext,
  updateTenantKnowledgeFileAssignment,
} from "@/lib/runtime/tenant-knowledge";

const tenantKnowledgeFileRouteParamsSchema = z.object({
  tenantId: z.uuid(),
  fileId: z.uuid(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; fileId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantKnowledgeFileRouteParamsSchema,
    errorMessage: "Invalid tenant or file ID",
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
      roleErrorMessage: "Insufficient role for tenant knowledge management",
      fallbackErrorMessage: "Failed to update tenant knowledge file",
    },
    async (state) => {
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

      const body = await request.json();
      const parsedBody = knowledgeUpdateSchema.safeParse(body);
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
      const context = buildTenantKnowledgeContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const file = await updateTenantKnowledgeFileAssignment(
        state.admin,
        context,
        parsedParams.data.fileId,
        parsedBody.data.agent_id ?? null
      );

      const responseBody: Record<string, unknown> = {
        file,
        legacy_instance_id: mapping.instanceId,
      };

      if (mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for deploy sync.";
      }

      return NextResponse.json(responseBody);
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; fileId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantKnowledgeFileRouteParamsSchema,
    errorMessage: "Invalid tenant or file ID",
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
      roleErrorMessage: "Insufficient role for tenant knowledge management",
      fallbackErrorMessage: "Failed to archive tenant knowledge file",
    },
    async (state) => {
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

      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const context = buildTenantKnowledgeContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      await archiveTenantKnowledgeFile(state.admin, context, parsedParams.data.fileId);

      const responseBody: Record<string, unknown> = {
        success: true,
        legacy_instance_id: mapping.instanceId,
      };

      if (mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for deploy sync.";
      }

      return NextResponse.json(responseBody);
    }
  );
}
