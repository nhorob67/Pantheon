import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const routeParamsSchema = z.object({
  tenantId: z.uuid(),
});

const browserActionSchema = z.enum([
  "navigate",
  "extract",
  "click",
  "fill",
  "screenshot",
]);

const updateBrowserPolicySchema = z.object({
  domain_allowlist: z.array(z.string().max(253)).max(50).optional(),
  domain_blocklist: z.array(z.string().max(253)).max(50).optional(),
  require_approval_actions: z.array(browserActionSchema).max(10).optional(),
  max_sessions_per_day: z.number().int().min(1).max(100).optional(),
  max_actions_per_session: z.number().int().min(1).max(100).optional(),
  max_session_duration_ms: z.number().int().min(10_000).max(300_000).optional(),
  base_cost_cents: z.number().int().min(0).max(1000).optional(),
  per_action_cost_cents: z.number().int().min(0).max(100).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load browser policy",
    },
    async (state) => {
      const { data } = await state.admin
        .from("tenant_browser_policies")
        .select("*")
        .eq("tenant_id", state.tenantContext.tenantId)
        .maybeSingle();

      return NextResponse.json({
        policy: data ?? {
          domain_allowlist: [],
          domain_blocklist: [],
          require_approval_actions: ["click", "fill"],
          max_sessions_per_day: 10,
          max_actions_per_session: 25,
          max_session_duration_ms: 120000,
          base_cost_cents: 2,
          per_action_cost_cents: 1,
        },
      });
    }
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
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
      roleErrorMessage: "Insufficient role for browser policy management",
      fallbackErrorMessage: "Failed to update browser policy",
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

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = updateBrowserPolicySchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const { data, error } = await state.admin
        .from("tenant_browser_policies")
        .upsert(
          {
            tenant_id: state.tenantContext.tenantId,
            customer_id: state.tenantContext.customerId,
            ...parsedBody.data,
            require_approval_actions: parsedBody.data.require_approval_actions
              ? [...new Set(parsedBody.data.require_approval_actions)]
              : undefined,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        )
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ policy: data });
    }
  );
}
