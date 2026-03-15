import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import {
  getLatestAgentEmailIdentityForTenant,
  ensureAgentEmailIdentity,
  deactivateAgentEmailIdentity,
  updateAgentEmailIdentitySlug,
  EmailIdentityConflictError,
  EmailIdentityNotFoundError,
  EmailIdentitySlugLockedError,
} from "@/lib/email/identity";
import { ensureAgentMailInboxForIdentity } from "@/lib/email/agentmail-identity";
import { EMAIL_SLUG_REGEX } from "@/lib/validators/email";

const routeParamsSchema = z.object({
  tenantId: z.uuid(),
  agentId: z.uuid(),
});

const updateSlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      EMAIL_SLUG_REGEX,
      "Use 3-63 characters: lowercase letters, numbers, and hyphens"
    ),
});

function parseRequestedSlug(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const candidate = (body as { slug?: unknown }).slug;
  if (typeof candidate !== "string") {
    return undefined;
  }

  const normalized = candidate.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (!EMAIL_SLUG_REGEX.test(normalized)) {
    throw new Response(
      JSON.stringify({
        error: "Use 3-63 characters: lowercase letters, numbers, and hyphens",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  return normalized;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
    errorMessage: "Invalid tenant or agent ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to fetch agent email identity",
    },
    async () => {
      const identity = await getLatestAgentEmailIdentityForTenant(
        parsed.data.tenantId,
        parsed.data.agentId
      );
      return NextResponse.json({ identity: identity || null });
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
    errorMessage: "Invalid tenant or agent ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      fallbackErrorMessage: "Failed to create agent email identity",
    },
    async (state) => {
      const rl = await consumeConfigUpdateRateLimit(state.user.id);
      if (rl === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }
      if (rl === "blocked") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      let requestedSlug: string | undefined;
      try {
        requestedSlug = parseRequestedSlug(await request.json().catch(() => ({})));
      } catch (response) {
        if (response instanceof Response) {
          return response;
        }
        throw response;
      }

      // Verify agent belongs to this tenant
      const { data: agent } = await state.admin
        .from("tenant_agents")
        .select("id, display_name")
        .eq("id", parsed.data.agentId)
        .eq("tenant_id", parsed.data.tenantId)
        .eq("status", "active")
        .single();

      if (!agent) {
        return NextResponse.json(
          { error: "Agent not found" },
          { status: 404 }
        );
      }

      // Get team slug for address generation
      const { data: team } = await state.admin
        .from("team_profiles")
        .select("team_name")
        .eq("customer_id", state.tenantContext.customerId)
        .maybeSingle();

      try {
        let identity = await ensureAgentEmailIdentity({
          customerId: state.tenantContext.customerId,
          tenantId: parsed.data.tenantId,
          agentId: parsed.data.agentId,
          agentDisplayName: agent.display_name,
          teamSlug: team?.team_name || undefined,
          requestedSlug,
        });

        // Provision AgentMail inbox
        identity = await ensureAgentMailInboxForIdentity(identity);

        return NextResponse.json({ identity }, { status: 201 });
      } catch (err) {
        if (err instanceof EmailIdentityConflictError) {
          return NextResponse.json(
            { error: err.message },
            { status: 409 }
          );
        }
        if (err instanceof EmailIdentitySlugLockedError) {
          return NextResponse.json(
            { error: err.message },
            { status: 409 }
          );
        }
        throw err;
      }
    }
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
    errorMessage: "Invalid tenant or agent ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      fallbackErrorMessage: "Failed to update agent email identity",
    },
    async (state) => {
      const rl = await consumeConfigUpdateRateLimit(state.user.id);
      if (rl === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }
      if (rl === "blocked") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      const body = await request.json();
      const parsedBody = updateSlugSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      try {
        const identity = await updateAgentEmailIdentitySlug(
          parsed.data.tenantId,
          parsed.data.agentId,
          parsedBody.data.slug
        );

        const updated = await ensureAgentMailInboxForIdentity(identity);
        return NextResponse.json({ identity: updated });
      } catch (err) {
        if (err instanceof EmailIdentityConflictError) {
          return NextResponse.json(
            { error: err.message },
            { status: 409 }
          );
        }
        if (err instanceof EmailIdentityNotFoundError) {
          return NextResponse.json(
            { error: err.message },
            { status: 404 }
          );
        }
        if (err instanceof EmailIdentitySlugLockedError) {
          return NextResponse.json(
            { error: err.message },
            { status: 409 }
          );
        }
        throw err;
      }
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
    errorMessage: "Invalid tenant or agent ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      fallbackErrorMessage: "Failed to deactivate agent email identity",
    },
    async (state) => {
      const rl = await consumeConfigUpdateRateLimit(state.user.id);
      if (rl === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }
      if (rl === "blocked") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      await deactivateAgentEmailIdentity(
        parsed.data.tenantId,
        parsed.data.agentId
      );
      return NextResponse.json({ deactivated: true });
    }
  );
}
