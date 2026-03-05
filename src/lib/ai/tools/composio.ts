import { tool, type ToolSet } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import { getComposioToolsForAgent } from "@/lib/composio/sdk-client";
import { executeTenantExternalToolInvocation } from "@/lib/runtime/tenant-runtime-tools";

interface CreateComposioToolsInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  composioUserId: string;
  toolkitIds: string[];
  runtimeRun: TenantRuntimeRun;
  actorRole: TenantRole;
  actorId: string | null;
}

interface TenantToolRow {
  id: string;
  tool_key: string;
}

interface TenantToolPolicyRow {
  tool_id: string;
}

interface ComposioCatalogEntry {
  composioToolName: string;
  tenantToolKey: string;
  description: string | undefined;
}

const ALL_TENANT_ROLES: TenantRole[] = ["owner", "admin", "operator", "viewer"];

function toTenantToolKey(composioToolName: string): string {
  const normalized = composioToolName
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "")
    .slice(0, 118);

  return `composio.${normalized || "tool"}`;
}

function toCatalogEntry(composioToolName: string, toolDef: ToolSet[string]): ComposioCatalogEntry {
  return {
    composioToolName,
    tenantToolKey: toTenantToolKey(composioToolName),
    description: toolDef.description,
  };
}

function normalizeToolOutput(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (value === undefined) {
    return { ok: true };
  }

  return { result: value };
}

async function ensureComposioTenantToolCatalog(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  catalog: ComposioCatalogEntry[]
): Promise<void> {
  if (catalog.length === 0) {
    return;
  }

  const toolKeys = catalog.map((entry) => entry.tenantToolKey);
  const { data: existingTools, error: existingToolsError } = await admin
    .from("tenant_tools")
    .select("id, tool_key")
    .eq("tenant_id", tenantId)
    .in("tool_key", toolKeys);

  if (existingToolsError) {
    throw new Error(existingToolsError.message);
  }

  const toolsByKey = new Map<string, TenantToolRow>(
    ((existingTools || []) as TenantToolRow[]).map((row) => [row.tool_key, row])
  );

  const missingEntries = catalog.filter((entry) => !toolsByKey.has(entry.tenantToolKey));

  if (missingEntries.length > 0) {
    const { data: insertedTools, error: insertToolsError } = await admin
      .from("tenant_tools")
      .insert(
        missingEntries.map((entry) => ({
          tenant_id: tenantId,
          customer_id: customerId,
          tool_key: entry.tenantToolKey,
          display_name: entry.composioToolName,
          description: entry.description || `Composio tool ${entry.composioToolName}`,
          status: "enabled",
          risk_level: "medium",
          config: {},
          metadata: {
            provider: "composio",
            composio_tool_name: entry.composioToolName,
            runtime_kind: "external_composio",
          },
        }))
      )
      .select("id, tool_key");

    if (insertToolsError && insertToolsError.code !== "23505") {
      throw new Error(insertToolsError.message);
    }

    for (const row of (insertedTools || []) as TenantToolRow[]) {
      toolsByKey.set(row.tool_key, row);
    }
  }

  const toolIds = Array.from(toolsByKey.values()).map((row) => row.id);
  if (toolIds.length === 0) {
    return;
  }

  const { data: existingPolicies, error: existingPoliciesError } = await admin
    .from("tenant_tool_policies")
    .select("tool_id")
    .eq("tenant_id", tenantId)
    .in("tool_id", toolIds);

  if (existingPoliciesError) {
    throw new Error(existingPoliciesError.message);
  }

  const policyToolIds = new Set(
    ((existingPolicies || []) as TenantToolPolicyRow[]).map((row) => row.tool_id)
  );

  const missingPolicies = catalog
    .map((entry) => toolsByKey.get(entry.tenantToolKey))
    .filter((row): row is TenantToolRow => !!row && !policyToolIds.has(row.id));

  if (missingPolicies.length === 0) {
    return;
  }

  const { error: insertPoliciesError } = await admin
    .from("tenant_tool_policies")
    .insert(
      missingPolicies.map((row) => ({
        tenant_id: tenantId,
        customer_id: customerId,
        tool_id: row.id,
        approval_mode: "none",
        allow_roles: ALL_TENANT_ROLES,
        max_calls_per_hour: 120,
        timeout_ms: 60000,
        metadata: {
          seeded_by: "composio_tool_wrapper",
        },
      }))
    );

  if (insertPoliciesError && insertPoliciesError.code !== "23505") {
    throw new Error(insertPoliciesError.message);
  }
}

export async function createComposioTools(
  input: CreateComposioToolsInput
): Promise<ToolSet> {
  if (input.toolkitIds.length === 0) {
    return {};
  }

  const rawTools = await getComposioToolsForAgent(
    input.composioUserId,
    input.toolkitIds
  );
  const catalog = Object.entries(rawTools).map(([name, toolDef]) =>
    toCatalogEntry(name, toolDef)
  );

  await ensureComposioTenantToolCatalog(
    input.admin,
    input.tenantId,
    input.customerId,
    catalog
  );

  const wrappedTools: ToolSet = {};

  for (const [composioToolName, rawTool] of Object.entries(rawTools)) {
    const tenantToolKey = toTenantToolKey(composioToolName);

    wrappedTools[composioToolName] = tool({
      description: rawTool.description,
      inputSchema: rawTool.inputSchema,
      execute: async (args) => {
        const outcome = await executeTenantExternalToolInvocation(input.admin, {
          run: input.runtimeRun,
          toolRequest: {
            toolKey: tenantToolKey,
            args: (args || {}) as Record<string, unknown>,
          },
          actorRole: input.actorRole,
          actorId: input.actorId,
          executeAllowedTool: async () =>
            normalizeToolOutput(
              await (rawTool.execute as (input: unknown) => Promise<unknown>)(args)
            ),
        });

        if (outcome.outcome === "awaiting_approval") {
          return {
            error: "This tool call requires tenant approval before it can run.",
            ...outcome.result,
          };
        }

        if (outcome.outcome === "failed") {
          return {
            error:
              outcome.errorMessage || "This tool call was blocked by tenant policy.",
            ...outcome.result,
          };
        }

        return outcome.result.tool_output &&
          typeof outcome.result.tool_output === "object" &&
          !Array.isArray(outcome.result.tool_output)
          ? (outcome.result.tool_output as Record<string, unknown>)
          : outcome.result;
      },
    });
  }

  return wrappedTools;
}
