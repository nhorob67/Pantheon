import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { auditLog } from "@/lib/security/audit";
import { workflowNLDraftRequestSchema } from "@/lib/validators/workflow";
import { generateWorkflowDraftFromNaturalLanguage } from "@/lib/workflows/nl-draft";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({ tenantId: z.uuid() });

export async function POST(
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
      fallbackErrorMessage: "Failed to generate workflow draft",
    },
    async (state) => {
      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const instanceId = mapping.instanceId;

      if (!instanceId) {
        return NextResponse.json(
          { error: "No instance mapping found" },
          { status: 404 }
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

      const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
        state.admin,
        state.tenantContext.customerId
      );

      if (!workflowBuilderEnabled) {
        return NextResponse.json(
          { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
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

      const parsedRequest = workflowNLDraftRequestSchema.safeParse(body);
      if (!parsedRequest.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedRequest.error.flatten() },
          { status: 400 }
        );
      }

      const draft = generateWorkflowDraftFromNaturalLanguage({
        prompt: parsedRequest.data.prompt,
        name: parsedRequest.data.name,
        description: parsedRequest.data.description,
        preferredTrigger: parsedRequest.data.preferred_trigger,
        maxNodes: parsedRequest.data.max_nodes,
      });

      auditLog({
        action: "workflow.nl_draft.generate",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: instanceId,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          detected_capabilities: draft.detected_capabilities,
          assumptions_count: draft.assumptions.length,
          warnings_count: draft.warnings.length,
          generated_node_count: draft.draft.graph.nodes.length,
          generated_edge_count: draft.draft.graph.edges.length,
        },
      });

      return NextResponse.json({
        draft: draft.draft,
        assumptions: draft.assumptions,
        warnings: draft.warnings,
        detected_capabilities: draft.detected_capabilities,
      });
    }
  );
}
