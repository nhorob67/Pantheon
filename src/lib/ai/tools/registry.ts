import type { Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent } from "@/types/tenant-runtime";
import type { TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import type { MemoryCaptureLevel } from "@/types/memory";
import { createWeatherTools } from "./weather";
import { createScaleTicketTools } from "./scale-tickets";
import { createGrainBidTools } from "./grain-bids";
import { createMemoryTools } from "./memory";
import { createScheduleTools } from "./schedules";
import { createComposioTools } from "./composio";
import { createCredentialTools } from "./credentials";
import { createHttpRequestTool } from "./http-request";
import { createSelfConfigTools } from "./self-config";

type ToolMap = Record<string, Tool>;

export interface ToolRegistryInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agent: TenantAgent;
  farmLat: number | null;
  farmLng: number | null;
  memoryCaptureLevel?: MemoryCaptureLevel;
  memoryExcludeCategories?: string[];
  channelId?: string;
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
}

function buildMemoryTools(input: ToolRegistryInput): ToolMap {
  return createMemoryTools(input.admin, input.tenantId, input.customerId, {
    captureLevel: input.memoryCaptureLevel,
    excludeCategories: input.memoryExcludeCategories,
  });
}

const SKILL_TO_TOOLS: Record<string, (input: ToolRegistryInput) => ToolMap> = {
  "farm-weather": (input) =>
    createWeatherTools(input.farmLat, input.farmLng),
  "farm-scale-tickets": (input) =>
    createScaleTicketTools(input.admin, input.tenantId, input.customerId),
  "farm-grain-bids": (input) =>
    createGrainBidTools(input.admin, input.customerId),
  "farm-memory": (input) => buildMemoryTools(input),
};

export async function resolveToolsForAgent(input: ToolRegistryInput): Promise<ToolMap> {
  const tools: ToolMap = {};
  const skills = input.agent.skills || [];

  for (const skill of skills) {
    const factory = SKILL_TO_TOOLS[skill];
    if (factory) {
      Object.assign(tools, factory(input));
    }
  }

  // Memory tools are always available
  if (!skills.includes("farm-memory")) {
    Object.assign(tools, buildMemoryTools(input));
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
    input.composioUserId &&
    input.runtimeRun &&
    input.actorRole
  ) {
    const composioTools = await createComposioTools({
      admin: input.admin,
      tenantId: input.tenantId,
      customerId: input.customerId,
      composioUserId: input.composioUserId,
      toolkitIds: input.composioToolkits,
      runtimeRun: input.runtimeRun,
      actorRole: input.actorRole,
      actorId: input.actorId ?? null,
    });
    Object.assign(tools, composioTools);
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

  // Remove disabled tools based on agent's tool_approval_overrides
  const overrides = (input.agent.config?.tool_approval_overrides ?? {}) as Record<string, string>;
  for (const [key, level] of Object.entries(overrides)) {
    if (level === "disabled" && key in tools) {
      delete tools[key];
    }
  }

  return tools;
}
