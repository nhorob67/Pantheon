/**
 * Query/integration tool output formatting.
 *
 * Provides human-readable fallback text when the model didn't produce
 * final prose after query-like tool calls.
 */

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

export function parseJsonObject(summary: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(summary);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid JSON summaries.
  }
  return null;
}

function extractBodyPayload(body: unknown): unknown {
  if (typeof body !== "string") return body;

  const trimmed = body.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

// ---------------------------------------------------------------------------
// Numeric extraction
// ---------------------------------------------------------------------------

function extractNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const extracted = extractNumericValue(value[index]);
      if (extracted !== null) return extracted;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["value", "count", "total", "y", "visitors", "visits"]) {
      const extracted = extractNumericValue(record[key]);
      if (extracted !== null) return extracted;
    }
    for (const nestedValue of Object.values(record).reverse()) {
      const extracted = extractNumericValue(nestedValue);
      if (extracted !== null) return extracted;
    }
  }

  return null;
}

function extractNamedNumericField(body: unknown, candidateKeys: readonly string[]): number | null {
  const keySet = new Set(candidateKeys.map((key) => key.toLowerCase()));
  const queue: unknown[] = [body];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    const record = current as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      if (keySet.has(key.toLowerCase())) {
        const numericValue = extractNumericValue(value);
        if (numericValue !== null) {
          return numericValue;
        }
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Traffic / Discourse helpers
// ---------------------------------------------------------------------------

function matchTrafficLabel(value: string): "visitors" | "visits" | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("visitor")) return "visitors";
  if (/\bvisits?\b/.test(normalized)) return "visits";
  return null;
}

function extractDiscourseTrafficMetric(body: unknown): { label: "visitors" | "visits"; value: number } | null {
  const queue: unknown[] = [body];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    const record = current as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      const label = matchTrafficLabel(key);
      if (label) {
        const numericValue = extractNumericValue(value);
        if (numericValue !== null) {
          return { label, value: numericValue };
        }
      }
    }

    const descriptor = [record.type, record.name, record.title, record.label, record.report_key]
      .find((value) => typeof value === "string" && value.trim().length > 0);
    if (typeof descriptor === "string") {
      const label = matchTrafficLabel(descriptor);
      if (label) {
        const numericValue = extractNumericValue(
          record.data ?? record.value ?? record.total ?? record.count ?? record.stats ?? record.points
        );
        if (numericValue !== null) {
          return { label, value: numericValue };
        }
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
}

export function formatDiscourseAboutStatsSummary(body: unknown): string | null {
  const visitors =
    extractNamedNumericField(body, ["visitors_last_day", "visits_last_day"])
    ?? extractNamedNumericField(body, ["active_users_last_day"]);
  const participating = extractNamedNumericField(body, ["participating_users_last_day"]);
  const newUsers = extractNamedNumericField(body, ["new_users_last_day", "users_last_day"]);
  const posts = extractNamedNumericField(body, ["posts_last_day"]);
  const topics = extractNamedNumericField(body, ["topics_last_day"]);
  const likes = extractNamedNumericField(body, ["likes_last_day"]);

  if (visitors === null && participating === null && newUsers === null && posts === null && topics === null && likes === null) {
    return null;
  }

  const lead = visitors !== null
    ? `In the last 24 hours, ${visitors.toLocaleString("en-US")} people visited the forum.`
    : participating !== null
      ? `In the last 24 hours, ${participating.toLocaleString("en-US")} people participated in the forum.`
      : "Here are the latest forum stats from the last 24 hours:";

  const details = [
    participating !== null ? `participating users: ${participating.toLocaleString("en-US")}` : null,
    newUsers !== null ? `new users: ${newUsers.toLocaleString("en-US")}` : null,
    posts !== null ? `posts: ${posts.toLocaleString("en-US")}` : null,
    topics !== null ? `topics: ${topics.toLocaleString("en-US")}` : null,
    likes !== null ? `likes: ${likes.toLocaleString("en-US")}` : null,
  ].filter((value): value is string => value !== null);

  if (details.length === 0) {
    return lead;
  }

  return `${lead}\n\n${details.map((detail) => `- ${detail}`).join("\n")}`;
}

// ---------------------------------------------------------------------------
// Body / field formatting
// ---------------------------------------------------------------------------

function formatBodyDetail(body: unknown): string | null {
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed || trimmed === "{}" || trimmed === "[]") return null;

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const detail = [parsed.message, parsed.error, parsed.detail, parsed.reason, parsed.title]
        .find((value) => typeof value === "string" && value.trim().length > 0);
      if (typeof detail === "string") {
        return detail;
      }
      return null;
    } catch {
      return trimmed.length <= 160 ? trimmed : `${trimmed.slice(0, 159).trimEnd()}…`;
    }
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const detail = [record.message, record.error, record.detail, record.reason, record.title]
      .find((value) => typeof value === "string" && value.trim().length > 0);
    if (typeof detail === "string") return detail;
  }

  return null;
}

function humanizeIntegrationName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "the integration";
  }

  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeFieldLabel(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizePrimitiveValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("en-US");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return null;
}

function collectStructuredSummaryLines(value: unknown, prefix = "", depth = 0): string[] {
  if (depth > 2 || !value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    const lines: string[] = [];
    for (const entry of value.slice(0, 3)) {
      const summary = summarizePrimitiveValue(entry);
      if (summary) {
        lines.push(summary);
        continue;
      }

      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const objectSummary = Object.entries(entry as Record<string, unknown>)
          .slice(0, 3)
          .map(([key, nestedValue]) => {
            const primitive = summarizePrimitiveValue(nestedValue);
            return primitive ? `${humanizeFieldLabel(key)}: ${primitive}` : null;
          })
          .filter((line): line is string => line !== null)
          .join(", ");
        if (objectSummary) {
          lines.push(objectSummary);
        }
      }
    }
    return lines;
  }

  const record = value as Record<string, unknown>;
  const lines: string[] = [];
  const ignoredKeys = new Set(["success", "status", "status_text", "integration", "server", "tool"]);

  for (const [key, nestedValue] of Object.entries(record)) {
    if (ignoredKeys.has(key)) {
      continue;
    }

    const primitive = summarizePrimitiveValue(nestedValue);
    if (primitive) {
      const label = prefix ? `${prefix} ${humanizeFieldLabel(key)}` : humanizeFieldLabel(key);
      lines.push(`${label}: ${primitive}`);
      continue;
    }

    if (nestedValue && typeof nestedValue === "object") {
      const nestedPrefix =
        key === "result" || key === "results" || key === "data" || key === "items" || key === "stats"
          ? prefix
          : prefix
            ? `${prefix} ${humanizeFieldLabel(key)}`
            : humanizeFieldLabel(key);
      lines.push(...collectStructuredSummaryLines(nestedValue, nestedPrefix, depth + 1));
    }

    if (lines.length >= 6) {
      break;
    }
  }

  return lines.slice(0, 6);
}

export function formatStructuredQuerySummary(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const resultText = summarizePrimitiveValue(record.result);
  if (resultText && !/^ok\b|^success\b/i.test(resultText)) {
    return resultText;
  }

  const lines = collectStructuredSummaryLines(value);
  if (lines.length === 0) {
    return null;
  }

  return `Here's what I found:\n\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

// ---------------------------------------------------------------------------
// Query-tool detection
// ---------------------------------------------------------------------------

function isLikelyQueryToolName(toolName: string): boolean {
  const normalized = toolName.toLowerCase();
  const mutatingPatterns = [
    /(?:^|[._-])(create|update|delete|remove|archive|set|write|save|send|post|put|patch|approve|reject|toggle|enable|disable|run|execute|trigger|submit)(?:$|[._-])/,
  ];
  if (mutatingPatterns.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return /(?:^|[._-])(get|list|search|find|read|fetch|query|lookup|retrieve|describe|show|view|inspect|stats|status)(?:$|[._-])/.test(
    normalized
  );
}

export function isGenericQueryResponse(
  responseText: string,
  records: ReadonlyArray<QueryLikeRecord & { success?: boolean; outputSummary?: string }>
): boolean {
  const hasSuccessfulQueryTool = records.some((record) => record.success !== false && isQueryLikeToolRecord(record));
  if (!hasSuccessfulQueryTool) {
    return false;
  }

  const normalized = responseText.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return true;
  }

  if (/responded normally\b/i.test(normalized)) {
    return true;
  }

  // Catch sanitized JSON placeholder from the hard guardrail
  if (/\[data retrieved\]/i.test(normalized)) {
    return true;
  }

  if (/^i checked\b/i.test(normalized) && !/[0-9]/.test(normalized) && !/:\s/.test(normalized)) {
    return true;
  }

  // Catch model output that embeds raw JSON (even if numbers are present)
  if (/^i (?:checked|called)\b/i.test(normalized) && /\{[^}]*"[^"]+":/.test(normalized)) {
    return true;
  }

  if (/through the api\b/i.test(normalized)) {
    return true;
  }

  return normalized.length < 90 && !/[0-9]/.test(normalized);
}

// ---------------------------------------------------------------------------
// QueryLikeRecord type & classification
// ---------------------------------------------------------------------------

export interface QueryLikeRecord {
  toolName: string;
  inputSummary: string;
}

export function isQueryLikeToolRecord(record: QueryLikeRecord): boolean {
  const name = record.toolName;
  if (
    name.startsWith("memory_search") ||
    name === "schedule_list" ||
    name.startsWith("conversation_") ||
    name === "config_view_my_config" ||
    name === "integration_list" ||
    name === "integration_templates"
  ) {
    return true;
  }

  if (name !== "integration_api_call") {
    if (name.startsWith("mcp_") || name.startsWith("mcp.")) {
      return isLikelyQueryToolName(name);
    }
    return false;
  }

  const parsedInput = parseJsonObject(record.inputSummary);
  const method = typeof parsedInput?.method === "string" ? parsedInput.method.toUpperCase() : "GET";
  return method === "GET";
}

// ---------------------------------------------------------------------------
// Query tool output formatting
// ---------------------------------------------------------------------------

export function formatQueryToolOutput(toolName: string, outputSummary: string, inputSummary = ""): string | null {
  try {
    const data = JSON.parse(outputSummary);

    if (toolName === "schedule_list") {
      const schedules = data.schedules ?? data;
      if (Array.isArray(schedules) && schedules.length === 0) {
        return "You don't have any schedules set up right now. Want me to create one?";
      }
      if (Array.isArray(schedules) && schedules.length > 0) {
        const lines = schedules.map((s: Record<string, unknown>) => {
          const name = s.name || s.display_name || s.schedule_key || "Unnamed";
          const freq = s.frequency || s.cron_expression || "";
          const status = s.enabled === false ? " (disabled)" : "";
          return `• **${name}** — ${freq}${status}`;
        });
        return `Here are your current schedules:\n\n${lines.join("\n")}`;
      }
    }

    if (toolName === "config_view_my_config") {
      if (data && typeof data === "object") {
        const role = data.role || data.agent_role;
        const goal = data.goal;
        if (role || goal) {
          const parts: string[] = [];
          if (role) parts.push(`**Role:** ${role}`);
          if (goal) parts.push(`**Goal:** ${goal}`);
          return `Here's my current configuration:\n\n${parts.join("\n")}`;
        }
      }
    }

    if (toolName === "memory_search") {
      const memories = data.memories ?? data.results ?? data;
      if (Array.isArray(memories) && memories.length === 0) {
        return "I didn't find any matching memories.";
      }
      if (Array.isArray(memories) && memories.length > 0) {
        const lines = memories.slice(0, 5).map((m: Record<string, unknown>) => {
          const content = m.content || m.text || m.summary || JSON.stringify(m);
          return `• ${typeof content === "string" ? content.slice(0, 200) : String(content)}`;
        });
        return `Here's what I found:\n\n${lines.join("\n")}`;
      }
    }

    if (toolName === "integration_api_call" && data && typeof data === "object") {
      const status = typeof data.status === "number" ? data.status : null;
      const statusText = typeof data.status_text === "string" ? ` ${data.status_text}` : "";
      const integrationName = humanizeIntegrationName(data.integration);
      const bodyPayload = extractBodyPayload(data.body);
      const bodyDetail = formatBodyDetail(bodyPayload);
      const parsedInput = parseJsonObject(inputSummary);
      const path = typeof parsedInput?.path === "string" ? parsedInput.path : "";
      const integrationSlug = typeof parsedInput?.integration_slug === "string" ? parsedInput.integration_slug : "";

      if (status !== null && (status < 200 || status >= 300)) {
        return bodyDetail
          ? `I checked ${integrationName}, but it came back ${status}${statusText}. ${bodyDetail}`
          : `I checked ${integrationName}, but it came back ${status}${statusText}.`;
      }

      if (
        integrationSlug === "discourse" &&
        (path.includes("/admin/dashboard") || path.includes("/about") || path.includes("/site/statistics"))
      ) {
        const aboutSummary = formatDiscourseAboutStatsSummary(bodyPayload);
        if (aboutSummary) {
          return aboutSummary;
        }

        const metric = extractDiscourseTrafficMetric(bodyPayload);
        if (metric) {
          return metric.label === "visitors"
            ? `There were ${metric.value.toLocaleString("en-US")} visitors in the last 24 hours.`
            : `The latest Discourse visits count is ${metric.value.toLocaleString("en-US")}.`;
        }
      }

      if (status !== null) {
        const structuredSummary = formatStructuredQuerySummary(bodyPayload ?? data);
        if (structuredSummary) {
          return structuredSummary;
        }
        return bodyDetail
          ? `I checked ${integrationName}. ${bodyDetail}`
          : `I called ${integrationName} and got a successful response, but I wasn't able to extract specific data to share. Try asking me about something more specific.`;
      }
    }

    if ((toolName.startsWith("mcp_") || toolName.startsWith("mcp.")) && data && typeof data === "object") {
      const structuredSummary = formatStructuredQuerySummary(data);
      if (structuredSummary) {
        return structuredSummary;
      }
    }
  } catch {
    // outputSummary wasn't valid JSON — fall through
  }
  return null;
}
