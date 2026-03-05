import type { Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent } from "@/types/tenant-runtime";
import type { MemoryCaptureLevel } from "@/types/memory";
import { createWeatherTools } from "./weather";
import { createScaleTicketTools } from "./scale-tickets";
import { createGrainBidTools } from "./grain-bids";
import { createMemoryTools } from "./memory";
import { createScheduleTools } from "./schedules";

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

export function resolveToolsForAgent(input: ToolRegistryInput): ToolMap {
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

  return tools;
}
