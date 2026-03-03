import { NextResponse } from "next/server.js";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  discordCanaryIngressSchema,
  tenantRouteParamsSchema,
} from "@/lib/runtime/tenant-api-contracts";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { evaluateTenantRuntimeIngressGovernance } from "@/lib/runtime/tenant-runtime-governance";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantRouteParamsSchema,
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
      roleErrorMessage: "Insufficient role for tenant Discord runtime ingress",
      fallbackErrorMessage: "Failed to enqueue Discord runtime run",
    },
    async (state) => {
      if (state.runtimeGates.discord_ingress_paused) {
        return NextResponse.json(
          { error: "Tenant runtime Discord ingress is currently paused" },
          { status: 409 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = discordCanaryIngressSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const idempotencyKey = request.headers.get("x-idempotency-key")
        || `${parsedBody.data.guild_id}:${parsedBody.data.channel_id}:${parsedBody.data.message_id}`;

      const governance = await evaluateTenantRuntimeIngressGovernance(state.admin, {
        tenantId: state.tenantContext.tenantId,
        content: parsedBody.data.content,
        channelId: parsedBody.data.channel_id,
        userId: parsedBody.data.user_id,
        runKind: "discord_runtime",
      });
      if (!governance.allowed) {
        return NextResponse.json(
          {
            error: governance.message || "Ingress blocked by runtime governance",
            code: governance.code,
            details: governance.details || null,
          },
          { status: governance.status }
        );
      }

      const run = await enqueueDiscordRuntimeRun(state.admin, {
        runKind: "discord_runtime",
        tenantId: state.tenantContext.tenantId,
        customerId: state.tenantContext.customerId,
        requestTraceId: state.requestTraceId,
        idempotencyKey,
        payload: {
          ...parsedBody.data,
          actor_role: state.tenantContext.memberRole,
          actor_id: state.user.id,
          ingress_received_at: new Date().toISOString(),
          ingress_mode: "discord_runtime",
        },
        metadata: {
          route: "/api/tenants/[tenantId]/discord/ingress",
          enqueued_by: state.user.id,
          ingress_channel_id: parsedBody.data.channel_id,
          ingress_user_id: parsedBody.data.user_id,
          ingress_content_hash: governance.contentHash,
          estimated_input_tokens: governance.estimatedTokens,
          requested_tool_calls: parsedBody.data.content.trim().startsWith("/tool ") ? 1 : 0,
          governance_policy: governance.policy,
          governance_snapshot: governance.details || {},
        },
      });

      return NextResponse.json(
        {
          run,
          accepted: true,
          worker_endpoint: "/api/admin/tenants/runtime/process",
        },
        { status: 202 }
      );
    }
  );
}
