import type { Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent } from "@/types/tenant-runtime";
import type { TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import type { MemoryCaptureLevel } from "@/types/memory";
import { createMemoryTools } from "./memory";
import { createConversationSearchTool } from "./conversation-search";
import { createScheduleTools } from "./schedules";
import { createComposioTools } from "./composio";
import { createCredentialTools } from "./credentials";
import { createHttpRequestTool } from "./http-request";
import { createWebSearchTool } from "./web-search";
import { createWebFetchTool } from "./web-fetch";
import { createSelfConfigTools } from "./self-config";
import { createMcpTools } from "./mcp";
import { createDelegateTaskTool, type DelegationToolConfig } from "./delegation";
import {
  createDelegateTaskAsyncTool,
  createDelegationPollTool,
  createDelegationCancelTool,
} from "./async-delegation";
import { createFileCreateTool } from "./file-create";
import { createIntegrationTools } from "./integrations";
import { ensureNativeToolCatalog } from "@/lib/runtime/tool-catalog";
import {
  isKillSwitchEnabled,
  resolveCustomerFeatureFlag,
} from "@/lib/queries/extensibility";
import { isWebToolAvailable } from "./web-tool-gating";
import { createBrowserTools } from "./browser";
import { isBrowserToolAvailable } from "./browser-tool-gating";
import { isDelegationToolAvailable } from "./delegation-tool-gating";
import { checkFlagDependencies } from "@/lib/runtime/tenant-runtime-release-gates";

type ToolMap = Record<string, Tool>;

export interface ToolRegistryResult {
  tools: ToolMap;
  composioKeyMap: Map<string, string>;
  mcpKeyMap: Map<string, string>;
}

export interface ToolRegistryInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agent: TenantAgent;
  memoryCaptureLevel?: MemoryCaptureLevel;
  memoryExcludeCategories?: string[];
  channelId?: string;
  sessionId?: string;
  timezone?: string;
  composioToolkits?: string[];
  composioUserId?: string;
  runtimeRun?: TenantRuntimeRun;
  actorRole?: TenantRole;
  actorId?: string | null;
  actorDiscordId?: string | null;
  legacyInstanceId?: string | null;
  secretsEnabled?: boolean;
  revealedSecretValues?: string[];
  /** Whether MCP tools are enabled for this tenant */
  mcpEnabled?: boolean;
  /** Whether browser automation tools are enabled for this tenant */
  browserEnabled?: boolean;
  /** Callback invoked when an agent creates a file via file_create tool */
  onFileCreated?: (file: {
    filename: string;
    buffer: Buffer;
    contentType: string;
    sizeBytes: number;
    storageKey: string;
    signedUrl: string;
  }) => void;
  /** Delegation config — when provided, enables the delegate_task tool */
  delegationConfig?: Omit<DelegationToolConfig, "admin" | "tenantId" | "customerId" | "parentAgent"> | null;
}

function buildMemoryTools(input: ToolRegistryInput): ToolMap {
  return createMemoryTools(input.admin, input.tenantId, input.customerId, {
    captureLevel: input.memoryCaptureLevel,
    excludeCategories: input.memoryExcludeCategories,
    sessionId: input.sessionId,
  });
}

const SKILL_TO_TOOLS: Record<string, (input: ToolRegistryInput) => ToolMap> = {};

export async function resolveToolsForAgent(input: ToolRegistryInput): Promise<ToolRegistryResult> {
  // Ensure native tools are registered in tenant_tools before resolution.
  // Idempotent and cached in-process — only hits DB once per tenant per process.
  await ensureNativeToolCatalog(input.admin, input.tenantId, input.customerId);

  const tools: ToolMap = {};
  let composioKeyMap = new Map<string, string>();
  let mcpKeyMap = new Map<string, string>();
  const skills = input.agent.skills || [];

  for (const skill of skills) {
    const factory = SKILL_TO_TOOLS[skill];
    if (factory) {
      Object.assign(tools, factory(input));
    }
  }

  // Memory tools are always available
  Object.assign(tools, buildMemoryTools(input));

  // Conversation search tool — always available when session context exists
  if (input.sessionId) {
    Object.assign(
      tools,
      createConversationSearchTool(input.admin, input.tenantId, input.sessionId)
    );
  }

  // Schedule tools are always available
  const channelId = input.channelId || "";
  const timezone = input.timezone || "America/Chicago";
  if (channelId) {
    Object.assign(
      tools,
      createScheduleTools(
        input.admin,
        input.tenantId,
        input.customerId,
        input.agent.id,
        channelId,
        timezone
      )
    );
  }

  // Composio third-party integration tools
  if (
    input.composioToolkits &&
    input.composioToolkits.length > 0 &&
    input.composioUserId
  ) {
    const composioResult = await createComposioTools({
      admin: input.admin,
      tenantId: input.tenantId,
      customerId: input.customerId,
      composioUserId: input.composioUserId,
      toolkitIds: input.composioToolkits,
    });
    Object.assign(tools, composioResult.tools);
    composioKeyMap = composioResult.keyMap;
  }

  // Secrets vault: credential handles + http_request with injection
  if (input.secretsEnabled) {
    const runId = input.runtimeRun?.id ?? null;
    const { data: revealSecretTool } = await input.admin
      .from("tenant_tools")
      .select("status")
      .eq("tenant_id", input.tenantId)
      .eq("tool_key", "reveal_secret")
      .maybeSingle();

    Object.assign(
      tools,
      createCredentialTools({
        admin: input.admin,
        tenantId: input.tenantId,
        customerId: input.customerId,
        agentId: input.agent.id,
        runtimeRun: input.runtimeRun,
        actorRole: input.actorRole,
        actorId: input.actorId ?? null,
        includeRevealSecret: revealSecretTool?.status === "enabled",
        revealedSecretValues: input.revealedSecretValues,
      }),
      createHttpRequestTool(
        input.admin,
        input.tenantId,
        input.customerId,
        input.agent.id,
        runId
      )
    );
  }

  // Integration tools — always available (self-contained credential management)
  Object.assign(
    tools,
    createIntegrationTools({
      admin: input.admin,
      tenantId: input.tenantId,
      customerId: input.customerId,
      agentId: input.agent.id,
      runId: input.runtimeRun?.id ?? null,
    })
  );

  // Web + browser tools — gated by rollout flags, kill switches, and tenant tool status.
  // Consolidated into a single Promise.all to reduce sequential DB round-trips.
  const ALL_GATED_TOOL_KEYS = [
    "web_search", "web_fetch",
    "browser_navigate", "browser_extract", "browser_click", "browser_fill", "browser_screenshot",
  ];

  const [
    webSearchRolloutEnabled,
    webFetchRolloutEnabled,
    webResearchPaused,
    browserRolloutEnabled,
    browserPaused,
    { data: allGatedToolStatuses },
  ] = await Promise.all([
    resolveCustomerFeatureFlag(input.admin, input.customerId, "tools.web_search"),
    resolveCustomerFeatureFlag(input.admin, input.customerId, "tools.web_fetch"),
    isKillSwitchEnabled(input.admin, "tools.web_research_pause"),
    resolveCustomerFeatureFlag(input.admin, input.customerId, "tools.browser_automation"),
    isKillSwitchEnabled(input.admin, "tools.browser_automation_pause"),
    input.admin
      .from("tenant_tools")
      .select("tool_key, status")
      .eq("tenant_id", input.tenantId)
      .in("tool_key", ALL_GATED_TOOL_KEYS),
  ]);

  const gatedToolStatus = new Map(
    (allGatedToolStatuses ?? []).map((r: { tool_key: string; status: string }) => [r.tool_key, r.status])
  );

  // Web research tools
  if (isWebToolAvailable({
    tenantStatus: gatedToolStatus.get("web_search"),
    rolloutEnabled: webSearchRolloutEnabled,
    webResearchPaused,
  })) {
    Object.assign(tools, createWebSearchTool());
  }
  if (isWebToolAvailable({
    tenantStatus: gatedToolStatus.get("web_fetch"),
    rolloutEnabled: webFetchRolloutEnabled,
    webResearchPaused,
  })) {
    Object.assign(tools, createWebFetchTool());
  }

  // Browser automation tools
  if (
    isBrowserToolAvailable({
      tenantStatus: gatedToolStatus.get("browser_navigate"),
      rolloutEnabled: browserRolloutEnabled,
      browserPaused,
    }) &&
    input.runtimeRun?.id
  ) {
    const browserTools = createBrowserTools({
      admin: input.admin,
      tenantId: input.tenantId,
      customerId: input.customerId,
      agentId: input.agent.id,
      runId: input.runtimeRun.id,
    });

    for (const toolKey of [
      "browser_navigate",
      "browser_extract",
      "browser_click",
      "browser_fill",
      "browser_screenshot",
    ] as const) {
      if (
        isBrowserToolAvailable({
          tenantStatus: gatedToolStatus.get(toolKey),
          rolloutEnabled: browserRolloutEnabled,
          browserPaused,
        })
      ) {
        tools[toolKey] = browserTools[toolKey];
      }
    }
  }

  // MCP tools — available when enabled for this tenant
  if (input.mcpEnabled && input.legacyInstanceId) {
    try {
      const mcpResult = await createMcpTools({
        admin: input.admin,
        tenantId: input.tenantId,
        customerId: input.customerId,
        agentId: input.agent.id,
        legacyInstanceId: input.legacyInstanceId,
      });
      Object.assign(tools, mcpResult.tools);
      mcpKeyMap = mcpResult.keyMap;
    } catch (err) {
      // Graceful degradation: MCP server issues should not block the agent
      console.warn(
        "[tool-registry] MCP tool hydration failed, continuing without MCP tools:",
        err instanceof Error ? err.message : "unknown error"
      );
    }
  }

  // File creation tool — always available when there's a runtime run
  if (input.runtimeRun?.id) {
    Object.assign(tools, createFileCreateTool(input.runtimeRun.id));
  }

  // Self-configuration tools — always available, role-gated internally
  const selfConfigTools = createSelfConfigTools({
    admin: input.admin,
    tenantId: input.tenantId,
    customerId: input.customerId,
    agent: input.agent,
    actorRole: input.actorRole ?? "viewer",
    actorDiscordId: input.actorDiscordId ?? null,
    runtimeRun: input.runtimeRun,
    legacyInstanceId: input.legacyInstanceId ?? null,
  });
  Object.assign(tools, selfConfigTools);

  // Delegation tools — gated by rollout flag, kill switch, and tenant tool status
  if (input.delegationConfig) {
    const [
      delegationRolloutEnabled,
      delegationPaused,
      { data: delegationToolStatuses },
    ] = await Promise.all([
      resolveCustomerFeatureFlag(input.admin, input.customerId, "tools.delegation"),
      isKillSwitchEnabled(input.admin, "tools.delegation_pause"),
      input.admin
        .from("tenant_tools")
        .select("tool_key, status")
        .eq("tenant_id", input.tenantId)
        .in("tool_key", [
          "delegate_task",
          "delegate_task_async",
          "delegation_poll",
          "delegation_cancel",
        ]),
    ]);

    const delegationToolStatus = new Map(
      (delegationToolStatuses ?? []).map((r: { tool_key: string; status: string }) => [r.tool_key, r.status])
    );

    const fullConfig = {
      admin: input.admin,
      tenantId: input.tenantId,
      customerId: input.customerId,
      parentAgent: input.agent,
      ...input.delegationConfig,
    };
    if (
      isDelegationToolAvailable({
        tenantStatus: delegationToolStatus.get("delegate_task"),
        rolloutEnabled: delegationRolloutEnabled,
        delegationPaused,
      })
    ) {
      Object.assign(tools, createDelegateTaskTool(fullConfig));
    }
    if (
      isDelegationToolAvailable({
        tenantStatus: delegationToolStatus.get("delegate_task_async"),
        rolloutEnabled: delegationRolloutEnabled,
        delegationPaused,
      })
    ) {
      Object.assign(tools, createDelegateTaskAsyncTool(fullConfig));
    }
    if (
      isDelegationToolAvailable({
        tenantStatus: delegationToolStatus.get("delegation_poll"),
        rolloutEnabled: delegationRolloutEnabled,
        delegationPaused,
      })
    ) {
      Object.assign(tools, createDelegationPollTool(fullConfig));
    }
    if (
      isDelegationToolAvailable({
        tenantStatus: delegationToolStatus.get("delegation_cancel"),
        rolloutEnabled: delegationRolloutEnabled,
        delegationPaused,
      })
    ) {
      Object.assign(tools, createDelegationCancelTool(fullConfig));
    }
  }

  // Remove disabled tools based on agent's tool_approval_overrides
  const overrides = (input.agent.config?.tool_approval_overrides ?? {}) as Record<string, string>;
  for (const [key, level] of Object.entries(overrides)) {
    if (level === "disabled" && key in tools) {
      delete tools[key];
    }
  }

  // Feature flag dependency enforcement — collect enabled flags and check
  // for violations. This is a guardrail that prevents inconsistent states
  // (e.g., browser_automation enabled without web_search).
  const enabledFlags = new Set<string>();
  if (webSearchRolloutEnabled) enabledFlags.add("tools.web_search");
  if (webFetchRolloutEnabled) enabledFlags.add("tools.web_fetch");
  if (browserRolloutEnabled) enabledFlags.add("tools.browser_automation");
  // Delegation flag is only resolved when delegationConfig is provided;
  // infer from whether delegation tools were actually added to the tool map.
  if ("delegate_task" in tools || "delegate_task_async" in tools) enabledFlags.add("tools.delegation");
  if (input.mcpEnabled) enabledFlags.add("tools.mcp_runtime");

  const flagViolations = checkFlagDependencies(enabledFlags);
  if (flagViolations.length > 0) {
    for (const v of flagViolations) {
      console.warn(
        `[tool-registry] Flag dependency violation: "${v.flag}" requires "${v.missingPrerequisite}" — disabling tools gated by "${v.flag}"`
      );
      enabledFlags.delete(v.flag);
    }
  }

  return { tools, composioKeyMap, mcpKeyMap };
}
