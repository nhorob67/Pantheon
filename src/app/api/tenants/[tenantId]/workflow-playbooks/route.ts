import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  createWorkflowPlaybookRequestSchema,
  listWorkflowPlaybooksQuerySchema,
} from "@/lib/validators/workflow";
import {
  listWorkflowPlaybookCatalog,
  publishWorkflowAsPlaybook,
} from "@/lib/workflows/playbooks";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

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
      fallbackErrorMessage: "Failed to load workflow playbooks",
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

      const query = new URL(request.url).searchParams;
      const parsedQuery = listWorkflowPlaybooksQuerySchema.safeParse({
        q: query.get("q") || undefined,
        category: query.get("category") || undefined,
        status: query.get("status") || undefined,
        visibility: query.get("visibility") || undefined,
        include_owned: query.get("include_owned") || undefined,
        limit: query.get("limit") || undefined,
      });

      if (!parsedQuery.success) {
        return NextResponse.json(
          { error: "Invalid query params", details: parsedQuery.error.flatten() },
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

      const playbooks = await listWorkflowPlaybookCatalog(state.admin, {
        customerId: state.tenantContext.customerId,
        includeOwned: parsedQuery.data.include_owned,
        search: parsedQuery.data.q,
        category: parsedQuery.data.category,
        status: parsedQuery.data.status,
        visibility: parsedQuery.data.visibility,
        limit: parsedQuery.data.limit,
      });

      return NextResponse.json({ playbooks });
    }
  );
}

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
      fallbackErrorMessage: "Failed to publish workflow playbook",
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

      const parsedRequest = createWorkflowPlaybookRequestSchema.safeParse(body);
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
        const result = await publishWorkflowAsPlaybook(state.admin, {
          instanceId,
          customerId: state.tenantContext.customerId,
          workflowId: parsedRequest.data.workflow_id,
          slug: parsedRequest.data.slug,
          name: parsedRequest.data.name,
          description: parsedRequest.data.description,
          summary: parsedRequest.data.summary,
          category: parsedRequest.data.category,
          tags: parsedRequest.data.tags,
          visibility: parsedRequest.data.visibility,
          status: parsedRequest.data.status,
          metadata: parsedRequest.data.metadata,
          actorId: state.user.id,
        });

        auditLog({
          action: "workflow.playbook.publish",
          actor: state.user.email || state.user.id,
          resource_type: "workflow_playbook",
          resource_id: result.playbook.id,
          details: {
            customer_id: state.tenantContext.customerId,
            instance_id: instanceId,
            workflow_id: parsedRequest.data.workflow_id,
            slug: result.playbook.slug,
            version: result.version.version,
            created: result.created,
            status: result.playbook.status,
            visibility: result.playbook.visibility,
          },
        });

        return NextResponse.json(
          {
            playbook: result.playbook,
            version: result.version,
            created: result.created,
          },
          { status: result.created ? 201 : 200 }
        );
      } catch (error) {
        const message = safeErrorMessage(
          error,
          "Failed to publish workflow playbook"
        );

        if (message.includes("not found") || message.includes("already in use")) {
          return NextResponse.json({ error: message }, { status: 409 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  );
}
