/**
 * Specialized prompt builders for cron schedules and follow-ups.
 */

const CRON_FINDINGS_INSTRUCTION =
  "\n\nWhen you call APIs or tools and get data back, present the specific numbers and findings in your message." +
  " The team cannot see your tool calls — they only see your final message." +
  " Never say 'I checked and it responded normally' — always share what you actually found.";

const CRON_PROMPTS: Record<string, string> = {
  morning_briefing_fallback:
    "Generate a morning operations briefing for the team. Include today's priorities, timing-sensitive items, and any conditions or blockers that could affect execution. Be concise." + CRON_FINDINGS_INSTRUCTION,
  daily_digest:
    "Generate a daily digest for the team. Highlight important external signals, notable changes since yesterday, and what needs attention today. Be concise." + CRON_FINDINGS_INSTRUCTION,
  evening_recap:
    "Generate an evening summary of today's activity. Show what was completed, what changed, and any notable details that should carry into tomorrow. If nothing happened, say so briefly." + CRON_FINDINGS_INSTRUCTION,
  // Legacy keys — kept for existing DB rows until schedule migration completes
  morning_weather:
    "Generate a morning operations briefing for the team. Include today's priorities, timing-sensitive items, and any conditions or blockers that could affect execution. Be concise." + CRON_FINDINGS_INSTRUCTION,
  daily_market_summary:
    "Generate a daily digest for the team. Highlight important external signals, notable changes since yesterday, and what needs attention today. Be concise." + CRON_FINDINGS_INSTRUCTION,
  evening_ticket_summary:
    "Generate an evening summary of today's activity. Show what was completed, what changed, and any notable details that should carry into tomorrow. If nothing happened, say so briefly." + CRON_FINDINGS_INSTRUCTION,
};

interface BriefingSections {
  // Current generic keys
  conditions?: boolean;
  external_updates?: boolean;
  activity_recap?: boolean;
  // Legacy keys — accepted for backward compatibility
  weather?: boolean;
  market_data?: boolean;
  ticket_summary?: boolean;
}

export function buildFollowUpPrompt(payload: Record<string, unknown>): string {
  const taskSummary =
    typeof payload.task_summary === "string"
      ? payload.task_summary
      : "a previous task";
  const reason =
    typeof payload.reason === "string" ? payload.reason : "";
  const parts = [
    `You scheduled this follow-up while working on: ${taskSummary}`,
  ];
  if (reason) parts.push(`You wanted to check back because: ${reason}`);
  parts.push(
    "Pick up where you left off naturally. Lead with your finding or update — don't announce this is a follow-up. " +
      "If the task is done, share the result. If it needs more time, explain and optionally schedule another follow-up."
  );
  return parts.join("\n\n");
}

export function buildCronPrompt(
  scheduleKey: string | null,
  payload?: Record<string, unknown>
): string {
  // Custom schedules carry their own prompt
  if (payload) {
    const customPrompt = payload.custom_prompt;
    if (typeof customPrompt === "string" && customPrompt.length > 0) {
      return customPrompt;
    }
  }

  if (scheduleKey === "morning_briefing" && payload) {
    const sections = (payload.briefing_sections || {}) as BriefingSections;
    const parts: string[] = [];
    // Accept both new and legacy section keys
    const hasConditions = sections.conditions ?? sections.weather;
    const hasExternalUpdates = sections.external_updates ?? sections.market_data;
    const hasActivityRecap = sections.activity_recap ?? sections.ticket_summary;
    if (hasConditions !== false) {
      parts.push(
        "Include timing-sensitive conditions or external constraints that could affect today's work."
      );
    }
    if (hasExternalUpdates !== false) {
      parts.push(
        "Include relevant external updates, plus any meaningful changes since yesterday."
      );
    }
    if (hasActivityRecap) {
      parts.push(
        "Include a short summary of yesterday's completed work and outstanding follow-ups."
      );
    }
    return `Generate a morning briefing for the team. ${parts.join(" ")} Be concise.${CRON_FINDINGS_INSTRUCTION}`;
  }

  if (scheduleKey && CRON_PROMPTS[scheduleKey]) {
    return CRON_PROMPTS[scheduleKey];
  }
  return "Generate a proactive update for the team based on your role and the current context." + CRON_FINDINGS_INSTRUCTION;
}
