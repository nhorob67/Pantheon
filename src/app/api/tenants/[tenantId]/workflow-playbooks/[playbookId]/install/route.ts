import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { installWorkflowPlaybookRequestSchema } from "@/lib/validators/workflow";
import { installWorkflowPlaybook } from "@/lib/workflows/playbooks";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  playbookId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; playbookId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or playbook ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to install workflow playbook",
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

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsedRequest = installWorkflowPlaybookRequestSchema.safeParse(body);
      if (!parsedRequest.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedRequest.error.flatten() },
          { status: 400 }
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

      try {
        const result = await installWorkflowPlaybook(state.admin, {
          instanceId,
          customerId: state.tenantContext.customerId,
          playbookId: parsed.data.playbookId,
          actorId: state.user.id,
          name: parsedRequest.data.name,
          description: parsedRequest.data.description,
          tags: parsedRequest.data.tags,
          ownerId: parsedRequest.data.owner_id,
        });

        auditLog({
          action: "workflow.playbook.install",
          actor: state.user.email || state.user.id,
          resource_type: "workflow",
          resource_id: result.workflow.id,
          details: {
            customer_id: state.tenantContext.customerId,
            instance_id: instanceId,
            playbook_id: result.playbook.id,
            playbook_slug: result.playbook.slug,
            playbook_version: result.playbook.latest_version,
          },
        });

        return NextResponse.json(
          {
            workflow: result.workflow,
            playbook: {
              id: result.playbook.id,
              slug: result.playbook.slug,
              name: result.playbook.name,
              latest_version: result.playbook.latest_version,
            },
          },
          { status: 201 }
        );
      } catch (error) {
        const message = safeErrorMessage(
          error,
          "Failed to install workflow playbook"
        );

        if (message.includes("not found") || message.includes("access")) {
          return NextResponse.json({ error: message }, { status: 404 });
        }

        if (message.includes("already exists")) {
          return NextResponse.json({ error: message }, { status: 409 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
