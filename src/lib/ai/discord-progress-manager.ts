/**
 * Discord progress management constants and helpers.
 *
 * Provides timing constants and contextual progress message generation
 * for long-running agent turns.
 */

export const PROGRESS_HEARTBEAT_INTERVAL_MS = 5_000;
export const TYPING_REFRESH_INTERVAL_MS = 10_000;
export const LONG_TASK_PROGRESS_UPDATE_MS = 20_000;
export const OBLIGATION_HEARTBEAT_UPDATE_MS = 20_000;
export const MAX_AUTOMATED_PROGRESS_UPDATES = 3;
export const APPROVAL_REQUIRED_REPLY =
  "This needs approval before I can proceed.";
const GENERIC_PROGRESS_MESSAGES = [
  "Still working through it.",
  "Almost there.",
  "Just finishing up.",
];

const CONTEXTUAL_PROGRESS_MESSAGES: Record<string, string[]> = {
  web_search: [
    "I'm reading through the search results now.",
    "Checking one more source to be thorough.",
  ],
  web_fetch: [
    "I'm going through the page now.",
    "Almost done reading through it.",
  ],
  delegate_task: [
    "My teammate is working on that part.",
    "Waiting on the result from my teammate.",
  ],
  delegate_task_async: [
    "My teammate is working on that part.",
    "Waiting on the result from my teammate.",
  ],
  memory_search: [
    "I'm digging through my notes on that.",
  ],
  integration_api_call: [
    "Waiting on the API response.",
    "Still waiting on the response.",
  ],
};

export function getContextualProgressMessage(toolPhase: string | null, index: number): string {
  if (toolPhase && CONTEXTUAL_PROGRESS_MESSAGES[toolPhase]) {
    const msgs = CONTEXTUAL_PROGRESS_MESSAGES[toolPhase];
    return msgs[Math.min(index, msgs.length - 1)];
  }
  return GENERIC_PROGRESS_MESSAGES[Math.min(index, GENERIC_PROGRESS_MESSAGES.length - 1)];
}
