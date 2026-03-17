import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { healthCheckMcpServer } from "@/lib/runtime/mcp-client";
import { decryptMcpSecrets } from "@/lib/runtime/mcp-secrets";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  serverId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; serverId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or MCP server ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "MCP health check failed",
    },
    async (state) => {
      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );

      // Load the server config
      const { data: server, error: serverError } = await state.admin
        .from("mcp_server_configs")
        .select("*")
        .eq("id", parsedParams.data.serverId)
        .eq("instance_id", mapping.instanceId)
        .maybeSingle();

      if (serverError || !server) {
        return NextResponse.json(
          { error: "MCP server not found" },
          { status: 404 }
        );
      }

      // Map the raw row to McpServerConfig
        const config = {
          ...server,
          args: Array.isArray(server.args) ? server.args : [],
          env_vars: decryptMcpSecrets(
            typeof server.env_vars === "object" && server.env_vars ? server.env_vars : {}
          ),
          headers: decryptMcpSecrets(
            typeof server.headers === "object" && server.headers ? server.headers : {}
          ),
          scope: server.scope === "agent" ? "agent" as const : "instance" as const,
          transport: server.transport === "sse" ? "sse" as const : "stdio" as const,
        };

      const result = await healthCheckMcpServer(
        state.admin,
        config,
        state.tenantContext.tenantId,
        state.tenantContext.customerId
      );

      return NextResponse.json({
        healthy: result.healthy,
        tool_count: result.toolCount,
        error: result.error ?? null,
      });
    }
  );
}
