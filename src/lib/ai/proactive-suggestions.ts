import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProactiveSuggestion {
  content: string;
  patternType: string;
  triggerCondition: string;
  confidence: number;
}

export async function getProactiveSuggestions(
  admin: SupabaseClient,
  tenantId: string,
  context: { dayOfWeek: string; timeOfDay: string; season: string }
): Promise<ProactiveSuggestion[]> {
  const { data, error } = await admin
    .from("tenant_memory_records")
    .select("content, confidence_score, metadata")
    .eq("tenant_id", tenantId)
    .like("content", "[pattern:%")
    .order("confidence_score", { ascending: false })
    .limit(20);

  if (error || !data?.length) return [];

  const contextTerms = [
    context.dayOfWeek.toLowerCase(),
    context.timeOfDay.toLowerCase(),
    context.season.toLowerCase(),
  ];

  const matched = data
    .map((row) => {
      const metadata = (row.metadata || {}) as Record<string, unknown>;
      const trigger = String(metadata.trigger_condition || "").toLowerCase();
      const relevance = contextTerms.filter((term) => trigger.includes(term)).length;
      return {
        content: parsePatternContent(row.content),
        patternType: String(metadata.pattern_type || "unknown"),
        triggerCondition: String(metadata.trigger_condition || ""),
        confidence: row.confidence_score ?? 0.5,
        relevance,
      };
    })
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.confidence - a.confidence)
    .slice(0, 3);

  return matched;
}

function parsePatternContent(raw: string): string {
  // Strip the "[pattern:type] " prefix and " | trigger: ..." suffix
  const withoutPrefix = raw.replace(/^\[pattern:\w+\]\s*/, "");
  const pipeIndex = withoutPrefix.lastIndexOf(" | trigger:");
  return pipeIndex >= 0 ? withoutPrefix.slice(0, pipeIndex) : withoutPrefix;
}

export function formatSuggestionsForPrompt(suggestions: ProactiveSuggestion[]): string {
  if (suggestions.length === 0) return "";

  const lines = suggestions.map(
    (s) => `- ${s.content} (${s.triggerCondition})`
  );

  return `## Proactive Suggestions

Based on this farmer's known patterns, the following may be relevant right now. Only bring these up if they naturally fit the current conversation — do not force them.

${lines.join("\n")}`;
}

export function getCurrentTemporalContext(): {
  dayOfWeek: string;
  timeOfDay: string;
  season: string;
} {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hour = now.getUTCHours();

  let timeOfDay: string;
  if (hour < 6) timeOfDay = "early morning";
  else if (hour < 12) timeOfDay = "morning";
  else if (hour < 17) timeOfDay = "afternoon";
  else timeOfDay = "evening";

  const month = now.getUTCMonth();
  let season: string;
  if (month >= 2 && month <= 4) season = "planting season";
  else if (month >= 5 && month <= 7) season = "growing season";
  else if (month >= 8 && month <= 10) season = "harvest season";
  else season = "winter";

  return {
    dayOfWeek: days[now.getUTCDay()],
    timeOfDay,
    season,
  };
}
