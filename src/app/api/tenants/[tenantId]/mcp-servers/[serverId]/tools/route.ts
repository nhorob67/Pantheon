import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { discoverMcpTools, loadCachedMcpTools } from "@/lib/runtime/mcp-client";
import { decryptMcpSecrets } from "@/lib/runtime/mcp-secrets";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  serverId: z.uuid(),
});

/**
 * GET: Load cached discovered tools for an MCP server.
 * POST: Force re-discovery (reconnect and refresh tool list).
 */
export async function GET(
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
      fallbackErrorMessage: "Failed to load MCP tools",
    },
    async (state) => {
      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );

      // Verify server belongs to this tenant
      const { data: server } = await state.admin
        .from("mcp_server_configs")
        .select("server_key")
        .eq("id", parsedParams.data.serverId)
        .eq("instance_id", mapping.instanceId)
        .maybeSingle();

      if (!server) {
        return NextResponse.json(
          { error: "MCP server not found" },
          { status: 404 }
        );
      }

      const tools = await loadCachedMcpTools(
        state.admin,
        parsedParams.data.serverId,
        server.server_key
      );

      return NextResponse.json({ tools });
    }
  );
}

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
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for MCP tool discovery",
      fallbackErrorMessage: "MCP tool discovery failed",
    },
    async (state) => {
      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );

      // Load full server config
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

      if (!server.enabled) {
        return NextResponse.json(
          { error: "MCP server is disabled. Enable it before discovering tools." },
          { status: 400 }
        );
      }

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

      try {
        const tools = await discoverMcpTools(
          state.admin,
          config,
          state.tenantContext.tenantId,
          state.tenantContext.customerId
        );

        return NextResponse.json({
          tools,
          tool_count: tools.length,
          discovered_at: new Date().toISOString(),
        });
      } catch (err) {
        return NextResponse.json(
          {
            error: "Tool discovery failed",
            message: err instanceof Error ? err.message : "Unknown error",
          },
          { status: 502 }
        );
      }
    }
  );
}
