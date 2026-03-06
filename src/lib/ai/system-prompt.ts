import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent } from "@/types/tenant-runtime";
import type { PersonalityPreset } from "@/types/agent";
import { toPersonalityPreset } from "@/types/agent";
import { renderSoulPreset, type SoulPresetData } from "@/lib/templates/soul-presets";
import {
  resolveCustomSkillsForAgent,
  formatCustomSkillsForPrompt,
} from "./custom-skill-resolver";

interface FarmProfileRow {
  farm_name: string;
  state: string;
  county: string;
  acres: number;
  crops: string[];
  elevators: { name: string }[];
  timezone: string;
  soil_ph: number | null;
  soil_cec: number | null;
  organic_matter_pct: number | null;
  avg_annual_rainfall_in: number | null;
}

function resolvePersonalityPreset(agent: TenantAgent): PersonalityPreset {
  const config = agent.config || {};
  return toPersonalityPreset(config.personality_preset);
}

export async function buildSystemPrompt(
  admin: SupabaseClient,
  agent: TenantAgent
): Promise<string> {
  // Load farm profile for this tenant's customer
  const { data: farmProfile } = await admin
    .from("farm_profiles")
    .select("farm_name, state, county, acres, crops, elevators, timezone, soil_ph, soil_cec, organic_matter_pct, avg_annual_rainfall_in")
    .eq("customer_id", agent.customer_id)
    .maybeSingle();

  const profile = (farmProfile as FarmProfileRow | null) || {
    farm_name: "Your Farm",
    state: "ND",
    county: "Unknown",
    acres: 0,
    crops: [],
    elevators: [],
    timezone: "America/Chicago",
    soil_ph: null,
    soil_cec: null,
    organic_matter_pct: null,
    avg_annual_rainfall_in: null,
  };

  const cropsList = Array.isArray(profile.crops) ? profile.crops.join(", ") : "Not configured";
  const elevatorNames = Array.isArray(profile.elevators)
    ? profile.elevators.map((e) => (typeof e === "string" ? e : e.name || "Unknown")).join(", ")
    : "Not configured";

  const preset = resolvePersonalityPreset(agent);
  const customPersonality =
    typeof agent.config?.custom_personality === "string"
      ? agent.config.custom_personality
      : null;

  const presetData: SoulPresetData = {
    farm_name: profile.farm_name || "Your Farm",
    agent_name: agent.display_name,
    state: profile.state || "ND",
    county: profile.county || "Unknown",
    acres: profile.acres || 0,
    crops_list: cropsList,
    elevator_names: elevatorNames,
    timezone: profile.timezone || "America/Chicago",
    soil_ph: profile.soil_ph,
    soil_cec: profile.soil_cec,
    organic_matter_pct: profile.organic_matter_pct,
    avg_annual_rainfall_in: profile.avg_annual_rainfall_in,
  };

  let systemPrompt = renderSoulPreset(preset, presetData, customPersonality);

  // Append active skill descriptions
  if (agent.skills && agent.skills.length > 0) {
    systemPrompt += `\n\n## Active Skills\n\nYou have the following skills enabled: ${agent.skills.join(", ")}.\n`;
    systemPrompt += `Use your tools when the farmer asks about topics covered by these skills.`;
  }

  // Append custom skills (SKILL.md content injected into prompt)
  const customSkills = await resolveCustomSkillsForAgent(
    admin,
    agent.customer_id,
    agent.skills || []
  );
  const customSkillsSection = formatCustomSkillsForPrompt(customSkills);
  if (customSkillsSection) {
    systemPrompt += `\n\n${customSkillsSection}`;
  }

  return systemPrompt;
}
