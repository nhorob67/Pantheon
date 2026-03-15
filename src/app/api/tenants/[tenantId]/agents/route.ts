import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { createAgentSchema } from "@/lib/validators/agent";

import { consumeAgentManagementRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  buildTenantAgentContext,
  createTenantRuntimeAgent,
  listTenantRuntimeAgents,
  resolveCanonicalLegacyInstanceForTenant,
} from "@/lib/runtime/tenant-agents";

const tenantAgentRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantAgentRouteParamsSchema,
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
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list tenant agents",
    },
    async (state) => {
      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const context = buildTenantAgentContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const agents = await listTenantRuntimeAgents(state.admin, context);

      // Batch-load agent email identities to avoid N+1
      const { data: agentIdentities } = await state.admin
        .from("email_identities")
        .select("id, agent_id, slug, address, sender_alias")
        .eq("tenant_id", state.tenantContext.tenantId)
        .eq("identity_type", "agent")
        .not("agent_id", "is", null)
        .eq("is_active", true);

      const identityMap = new Map<string, { id: string; slug: string; address: string; sender_alias: string }>();
      if (agentIdentities) {
        for (const ident of agentIdentities) {
          if (ident.agent_id) {
            identityMap.set(ident.agent_id, {
              id: ident.id,
              slug: ident.slug,
              address: ident.address,
              sender_alias: ident.sender_alias,
            });
          }
        }
      }

      const agentsWithEmail = (agents as unknown as Array<Record<string, unknown>>).map((agent) => ({
        ...agent,
        email_identity: identityMap.get(agent.id as string) || null,
      }));

      const responseBody: Record<string, unknown> = {
        agents: agentsWithEmail,
        legacy_instance_id: mapping.instanceId,
      };

      if (mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for runtime sync.";
      }

      return NextResponse.json(responseBody);
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantAgentRouteParamsSchema,
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
      roleErrorMessage: "Insufficient role for tenant agent management",
      fallbackErrorMessage: "Failed to create tenant agent",
    },
    async (state) => {
      const rateLimit = await consumeAgentManagementRateLimit(state.user.id);
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
      const parsedBody = createAgentSchema.safeParse(body);
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
      const context = buildTenantAgentContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const agent = await createTenantRuntimeAgent(state.admin, context, parsedBody.data);

      const responseBody: Record<string, unknown> = {
        agent,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "Agent created. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
        );
      }

      if (warnings.length > 0) {
        responseBody.warnings = warnings;
        responseBody.warning = warnings[0];
      }

      return NextResponse.json(responseBody, { status: 201 });
    }
  );
}
