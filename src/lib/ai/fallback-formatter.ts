/**
 * Rich informational fallback formatter and tool status messages.
 *
 * When the model uses informational tools (web_search, web_fetch) but produces
 * no usable final prose, this module formats the tool results into a helpful
 * user-facing message instead of a generic "Done! I web search." confirmation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal step shape from AI SDK v6 generateText result */
export interface StepResult {
  toolResults?: Array<{
    toolName: string;
    result?: unknown;
    [key: string]: unknown;
  }>;
  toolCalls?: Array<{
    toolName: string;
    [key: string]: unknown;
  }>;
}

/** Minimal executor record shape */
export interface ExecutorRecord {
  toolName: string;
  success: boolean;
  outputSummary: string;
}

interface ParsedWebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ParsedWebFetchResult {
  url: string;
  title: string | null;
  description: string | null;
  content: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FALLBACK_LENGTH = 1800;
const MAX_SNIPPET_LENGTH = 120;
const MAX_FETCH_CONTENT_LENGTH = 300;
const MAX_SEARCH_RESULTS = 3;

/** Tools that return information the user expects to see */
const INFORMATIONAL_TOOLS = new Set(["web_search", "web_fetch"]);

// ---------------------------------------------------------------------------
// Tool status messages (Layer 3)
// ---------------------------------------------------------------------------

const STATUS_MESSAGES: Record<string, string> = {
  web_search: "Checking a couple of sources now.",
  web_fetch: "Reading through that now.",
  memory_search: "Checking what I already know about that.",
  memory_store: "Saving that for later.",
  conversation_search: "Looking back through our earlier messages.",
  knowledge_search: "Checking the knowledge base.",
  delegate_task: "I pulled in another agent for that part.",
  delegate_task_async: "I pulled in another agent for that part.",
  integration_api_call: "Checking the API now.",
  integration_register: "Setting up the integration now.",
  integration_store_credential: "Saving the credential securely.",
  schedule_create: "Setting up the schedule now.",
  schedule_update: "Updating the schedule now.",
  schedule_delete: "Removing the schedule now.",
  self_config_update: "Adjusting my settings.",
  task_follow_up: "Scheduling a follow-up on that.",
};

/**
 * Returns a contextual status message for a tool, or null if no status
 * message should be shown (e.g. for action-only tools).
 */
export function getToolStatusMessage(toolName: string): string | null {
  if (STATUS_MESSAGES[toolName]) return STATUS_MESSAGES[toolName];
  if (toolName.startsWith("browser_")) return "Opening it directly so I can check.";
  return null;
}

export function getToolStatusKey(toolName: string): string | null {
  if (STATUS_MESSAGES[toolName]) return toolName;
  if (toolName.startsWith("browser_")) return "browser";
  return null;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function truncateSnippet(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

/**
 * Parse web_search results from a full toolResults entry (untruncated).
 */
function parseWebSearchFromToolResult(result: unknown): ParsedWebSearchResult[] {
  if (!result || typeof result !== "object") return [];
  const obj = result as Record<string, unknown>;
  if (!Array.isArray(obj.results)) return [];
  const parsed: ParsedWebSearchResult[] = [];
  for (const r of obj.results) {
    if (!r || typeof r !== "object") continue;
    const entry = r as Record<string, unknown>;
    if (typeof entry.url !== "string" || !entry.url) continue;
    parsed.push({
      title: typeof entry.title === "string" ? entry.title : entry.url,
      url: entry.url,
      snippet: typeof entry.snippet === "string" ? entry.snippet : "",
    });
  }
  return parsed;
}

/**
 * Parse web_fetch result from a full toolResults entry (untruncated).
 */
function parseWebFetchFromToolResult(result: unknown): ParsedWebFetchResult | null {
  if (!result || typeof result !== "object") return null;
  const obj = result as Record<string, unknown>;
  if (typeof obj.url !== "string" || !obj.url) return null;
  if (typeof obj.error === "string") return null;
  return {
    url: obj.url,
    title: typeof obj.title === "string" ? obj.title : null,
    description: typeof obj.description === "string" ? obj.description : null,
    content: typeof obj.content === "string" ? obj.content : null,
  };
}

/**
 * Parse web_search results from a (possibly truncated) outputSummary string.
 */
function parseWebSearchFromSummary(summary: string): ParsedWebSearchResult[] {
  try {
    const obj = JSON.parse(summary);
    return parseWebSearchFromToolResult(obj);
  } catch {
    return [];
  }
}

/**
 * Parse web_fetch result from a (possibly truncated) outputSummary string.
 */
function parseWebFetchFromSummary(summary: string): ParsedWebFetchResult | null {
  try {
    const obj = JSON.parse(summary);
    return parseWebFetchFromToolResult(obj);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Friendly action mapping (reused from tenant-ai-worker.ts fallback)
// ---------------------------------------------------------------------------

function friendlyAction(toolName: string): string | null {
  if (toolName.startsWith("memory_search")) return "searched your memories";
  if (toolName.startsWith("memory_create") || toolName.startsWith("memory_upsert")) return "saved that to memory";
  if (toolName.startsWith("memory_update")) return "updated your memory";
  if (toolName.startsWith("memory_delete")) return "removed that from memory";
  if (toolName === "schedule_list") return "looked up your schedules";
  if (toolName.startsWith("schedule_create")) return "set up the schedule";
  if (toolName.startsWith("schedule_delete")) return "removed the schedule";
  if (toolName.startsWith("schedule_toggle")) return "toggled the schedule";
  if (toolName.startsWith("schedule_")) return "updated your schedules";
  if (toolName.startsWith("conversation_")) return "checked our conversation history";
  if (toolName === "config_view_my_config") return "checked my configuration";
  if (toolName === "delegate_task" || toolName === "delegate_task_async") return "handed that off to a teammate";
  if (toolName === "task_follow_up") return "scheduled a follow-up";
  if (toolName === "file_create") return "created a file";
  if (toolName.startsWith("config_")) return "updated the configuration";
  if (toolName === "integration_store_credential") return "stored the credential securely";
  if (toolName === "integration_register") return "registered the integration";
  if (toolName === "integration_api_call") return "made the API call";
  if (toolName === "integration_list") return "checked your integrations";
  if (toolName === "integration_templates") return "looked up integration templates";
  return null;
}

function parseJsonObject(summary: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(summary);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid JSON and fall back to generic text.
  }
  return null;
}

function humanizeSlug(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateSentence(value: string, maxLen: number): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLen) return normalized;
  return normalized.slice(0, maxLen).trimEnd() + "…";
}

function extractApiBodyDetail(body: unknown): string | null {
  if (typeof body !== "string" || !body.trim()) return null;

  const bodyText = body.trim();
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const detail = [
      parsed.message,
      parsed.error,
      parsed.detail,
      parsed.reason,
      parsed.title,
    ].find((value) => typeof value === "string" && value.trim().length > 0);

    if (typeof detail === "string") {
      return truncateSentence(detail, 140);
    }

    return null;
  } catch {
    // Plain text response body.
  }

  const compact = truncateSentence(bodyText, 140);
  if (!compact || compact === "{}" || compact === "[]") return null;
  return compact;
}

function formatIntegrationApiCallOutcome(outputSummary: string): string | null {
  const parsed = parseJsonObject(outputSummary);
  if (!parsed || typeof parsed.status !== "number") return null;

  const integrationName =
    typeof parsed.integration === "string" && parsed.integration.trim().length > 0
      ? humanizeSlug(parsed.integration)
      : "The integration";
  const statusText =
    typeof parsed.status_text === "string" && parsed.status_text.trim().length > 0
      ? ` ${parsed.status_text.trim()}`
      : "";
  const status = parsed.status;
  const bodyDetail = extractApiBodyDetail(parsed.body);
  const rateLimitWarning =
    typeof parsed.rate_limit_warning === "string" && parsed.rate_limit_warning.trim().length > 0
      ? parsed.rate_limit_warning.trim()
      : null;

  const lead =
    status >= 200 && status < 300
      ? bodyDetail
        ? `I checked ${integrationName}. ${bodyDetail}`
        : `I checked ${integrationName} and it responded normally.`
      : bodyDetail
        ? `I checked ${integrationName}, but it came back ${status}${statusText}. ${bodyDetail}`
        : `I checked ${integrationName}, but it came back ${status}${statusText}.`;

  return [lead, rateLimitWarning].filter(Boolean).join(" ");
}

function formatSpecializedActionOutcome(record: ExecutorRecord): string | null {
  if (!record.success) return null;

  if (record.toolName === "integration_api_call") {
    return formatIntegrationApiCallOutcome(record.outputSummary);
  }

  return null;
}

function joinActionTexts(texts: string[]): string {
  if (texts.length === 1) return texts[0];
  return `${texts.slice(0, -1).join(", ")} and ${texts[texts.length - 1]}`;
}

export function formatActionFallback(records: ReadonlyArray<ExecutorRecord>): string | null {
  const successfulRecords = records.filter((record) => record.success);
  if (successfulRecords.length === 0) return null;

  const specializedMessages: string[] = [];
  const genericActions: string[] = [];

  for (const record of successfulRecords) {
    const specialized = formatSpecializedActionOutcome(record);
    if (specialized) {
      if (!specializedMessages.includes(specialized)) {
        specializedMessages.push(specialized);
      }
      continue;
    }

    const action = friendlyAction(record.toolName) ?? record.toolName.replace(/_/g, " ");
    if (!genericActions.includes(action)) {
      genericActions.push(action);
    }
  }

  if (specializedMessages.length > 0) {
    const messageParts = [...specializedMessages];
    if (genericActions.length > 0) {
      messageParts.push(`I also ${joinActionTexts(genericActions)}.`);
    }
    return messageParts.join(" ");
  }

  if (genericActions.length === 1) {
    return `I ${genericActions[0]}.`;
  }

  return `I ${joinActionTexts(genericActions)}.`;
}

// ---------------------------------------------------------------------------
// Main formatter (Layer 1)
// ---------------------------------------------------------------------------

/**
 * Build a rich fallback message from informational tool results when the model
 * produced no usable final prose. Returns null if there are no informational
 * tool results to format (so the caller should fall back to the existing
 * action-only path).
 */
export function formatInformationalFallback(
  steps: ReadonlyArray<StepResult>,
  records: ReadonlyArray<ExecutorRecord>
): string | null {
  const seen = new Set<string>();
  const searchResults: ParsedWebSearchResult[] = [];
  const fetchResults: ParsedWebFetchResult[] = [];

  // 1. Try rich step-level toolResults first (untruncated)
  for (const step of steps) {
    if (!step.toolResults) continue;
    for (const tr of step.toolResults) {
      if (tr.toolName === "web_search") {
        for (const r of parseWebSearchFromToolResult(tr.result)) {
          if (!seen.has(r.url)) {
            seen.add(r.url);
            searchResults.push(r);
          }
        }
      }
      if (tr.toolName === "web_fetch") {
        const parsed = parseWebFetchFromToolResult(tr.result);
        if (parsed && !seen.has(parsed.url)) {
          seen.add(parsed.url);
          fetchResults.push(parsed);
        }
      }
    }
  }

  // 2. Fall back to executor outputSummary (possibly truncated)
  if (searchResults.length === 0 && fetchResults.length === 0) {
    for (const r of records) {
      if (!r.success) continue;
      if (r.toolName === "web_search") {
        for (const sr of parseWebSearchFromSummary(r.outputSummary)) {
          if (!seen.has(sr.url)) {
            seen.add(sr.url);
            searchResults.push(sr);
          }
        }
      }
      if (r.toolName === "web_fetch") {
        const parsed = parseWebFetchFromSummary(r.outputSummary);
        if (parsed && !seen.has(parsed.url)) {
          seen.add(parsed.url);
          fetchResults.push(parsed);
        }
      }
    }
  }

  // No informational results at all — let caller use action-only fallback
  if (searchResults.length === 0 && fetchResults.length === 0) return null;

  // 3. Build the message parts
  const parts: string[] = [];

  // Search results (up to MAX_SEARCH_RESULTS)
  if (searchResults.length > 0) {
    parts.push("Here's what I found:");
    parts.push("");
    const display = searchResults.slice(0, MAX_SEARCH_RESULTS);
    for (const r of display) {
      const snippet = r.snippet ? ` — ${truncateSnippet(r.snippet, MAX_SNIPPET_LENGTH)}` : "";
      parts.push(`**${r.title}**${snippet}`);
      parts.push(r.url);
      parts.push("");
    }
    if (searchResults.length > MAX_SEARCH_RESULTS) {
      parts.push(`_(${searchResults.length - MAX_SEARCH_RESULTS} more results not shown)_`);
      parts.push("");
    }
  }

  // Fetch results
  if (fetchResults.length > 0) {
    for (const f of fetchResults) {
      // If this URL was already shown in search results, skip to avoid duplication
      // (seen set was built during search parsing, but fetch URLs were also added)
      const label = f.title || f.url;
      if (f.description) {
        parts.push(`**${label}**`);
        parts.push(f.description);
        parts.push(f.url);
      } else if (f.content) {
        parts.push(`**${label}**`);
        parts.push(truncateSnippet(f.content, MAX_FETCH_CONTENT_LENGTH));
        parts.push(f.url);
      } else {
        parts.push(`**${label}**`);
        parts.push(f.url);
      }
      parts.push("");
    }
  }

  // Sparse results warning
  if (searchResults.length === 0 && fetchResults.length > 0) {
    // Only fetches, no search results — no extra warning needed
  } else if (searchResults.length < 2 && fetchResults.length === 0) {
    parts.push("Results were limited — you may want to try a more specific search.");
  }

  // 4. Append action confirmations for any non-informational tools that also succeeded
  const actionConfirmations: string[] = [];
  for (const r of records) {
    if (!r.success || INFORMATIONAL_TOOLS.has(r.toolName)) continue;
    const action = friendlyAction(r.toolName);
    if (action && !actionConfirmations.includes(action)) {
      actionConfirmations.push(action);
    }
  }
  if (actionConfirmations.length > 0) {
    const joined = actionConfirmations.length === 1
      ? actionConfirmations[0]
      : actionConfirmations.slice(0, -1).join(", ") + " and " + actionConfirmations[actionConfirmations.length - 1];
    parts.push(`I also ${joined}.`);
  }

  // 5. Enforce character limit
  let message = parts.join("\n").trim();
  if (message.length > MAX_FALLBACK_LENGTH) {
    message = message.slice(0, MAX_FALLBACK_LENGTH - 3).trimEnd() + "…";
  }

  return message;
}

// ---------------------------------------------------------------------------
// Generic-answer detector (Layer 4)
// ---------------------------------------------------------------------------

/**
 * Detects whether a response text is a generic tool confirmation that doesn't
 * contain actual findings from informational tools.
 */
export function isGenericInformationalResponse(
  responseText: string,
  records: ReadonlyArray<ExecutorRecord>
): boolean {
  const hasSuccessfulInfoTool = records.some(
    (r) => r.success && INFORMATIONAL_TOOLS.has(r.toolName)
  );
  if (!hasSuccessfulInfoTool) return false;

  const text = responseText.trim();

  // Pattern: starts with "Done! I" (the existing fallback format)
  if (/^done!?\s+i\s/i.test(text)) return true;

  // Pattern: generic confirmation mentioning search/fetch
  if (/^(done|all set|got it)!?\s*(i\s+)?(web search|searched|fetched|looked)/i.test(text)) return true;

  // Pattern: very short despite successful informational tools with results
  if (text.length < 100) return true;

  // Pattern: no URLs despite web_search returning results with URLs
  const hasSearchWithUrls = records.some((r) => {
    if (r.toolName !== "web_search" || !r.success) return false;
    try {
      const parsed = JSON.parse(r.outputSummary);
      return Array.isArray(parsed.results) && parsed.results.some(
        (entry: Record<string, unknown>) => typeof entry.url === "string"
      );
    } catch {
      return false;
    }
  });
  if (hasSearchWithUrls && !text.includes("http")) return true;

  return false;
}
