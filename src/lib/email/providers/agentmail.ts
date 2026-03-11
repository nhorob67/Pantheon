const DEFAULT_AGENTMAIL_API_BASE_URL = "https://api.agentmail.to";

export class AgentMailConfigurationError extends Error {}

export class AgentMailRequestError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface AgentMailClientOptions {
  apiKey?: string;
  apiBaseUrl?: string;
}

interface AgentMailCreateInboxInput {
  identifier: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentMailInbox {
  id: string;
  identifier: string | null;
  emailAddress: string | null;
  raw: Record<string, unknown>;
}

function getPathValue(
  source: Record<string, unknown>,
  path: string[]
): unknown {
  let current: unknown = source;
  for (const part of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function firstString(
  source: Record<string, unknown>,
  paths: string[][]
): string | null {
  for (const path of paths) {
    const value = getPathValue(source, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function normalizeInbox(raw: Record<string, unknown>): AgentMailInbox {
  const id = firstString(raw, [["id"], ["data", "id"], ["inbox", "id"]]);
  if (!id) {
    throw new Error("AgentMail inbox response did not include an id");
  }

  const identifier = firstString(raw, [
    ["identifier"],
    ["data", "identifier"],
    ["inbox", "identifier"],
    ["slug"],
    ["data", "slug"],
  ]);
  const emailAddress = firstString(raw, [
    ["email_address"],
    ["emailAddress"],
    ["address"],
    ["data", "email_address"],
    ["data", "emailAddress"],
    ["data", "address"],
    ["inbox", "email_address"],
    ["inbox", "emailAddress"],
    ["inbox", "address"],
  ]);

  return {
    id,
    identifier,
    emailAddress,
    raw,
  };
}

function normalizeListPayload(
  payload: Record<string, unknown>
): Record<string, unknown>[] {
  if (Array.isArray(payload.data)) {
    return payload.data.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  if (Array.isArray(payload.items)) {
    return payload.items.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  if (Array.isArray(payload.inboxes)) {
    return payload.inboxes.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  return [];
}

export function createAgentMailClient(options: AgentMailClientOptions = {}) {
  const apiKey = options.apiKey || process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    throw new AgentMailConfigurationError("AGENTMAIL_API_KEY is not configured");
  }

  const baseUrl = (
    options.apiBaseUrl ||
    process.env.AGENTMAIL_API_BASE_URL ||
    DEFAULT_AGENTMAIL_API_BASE_URL
  ).replace(/\/+$/, "");

  async function requestJson(
    method: string,
    path: string,
    init?: {
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    }
  ): Promise<Record<string, unknown>> {
    const response = await requestRaw(method, path, init);
    const text = await response.text();
    let payload: unknown = {};
    if (text.length > 0) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as Record<string, unknown>).error)
          : `AgentMail request failed with status ${response.status}`;
      throw new AgentMailRequestError(detail, response.status, payload);
    }

    if (!payload || typeof payload !== "object") {
      return {};
    }

    return payload as Record<string, unknown>;
  }

  async function requestRaw(
    method: string,
    path: string,
    init?: {
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    }
  ): Promise<Response> {
    const headers = new Headers({
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "User-Agent": "pantheon-agentmail-client/1.0",
    });

    if (init?.headers) {
      for (const [key, value] of Object.entries(init.headers)) {
        headers.set(key, value);
      }
    }

    let body: string | undefined;
    if (init?.body) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(init.body);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AgentMailRequestError(
        `AgentMail request failed with status ${response.status}`,
        response.status,
        text
      );
    }

    return response;
  }

  return {
    async createInbox(input: AgentMailCreateInboxInput): Promise<AgentMailInbox> {
      const payload = await requestJson("POST", "/v0/inboxes", {
        body: {
          identifier: input.identifier,
          purpose: input.purpose || "transactional",
          metadata: input.metadata || {},
        },
      });

      return normalizeInbox(payload);
    },

    async listInboxes(): Promise<AgentMailInbox[]> {
      const payload = await requestJson("GET", "/v0/inboxes");
      return normalizeListPayload(payload).map((item) => normalizeInbox(item));
    },

    async getInbox(inboxId: string): Promise<AgentMailInbox> {
      const payload = await requestJson(
        "GET",
        `/v0/inboxes/${encodeURIComponent(inboxId)}`
      );
      return normalizeInbox(payload);
    },

    async findInboxByIdentifier(identifier: string): Promise<AgentMailInbox | null> {
      const normalized = identifier.trim().toLowerCase();
      if (!normalized) return null;

      const payload = await requestJson("GET", "/v0/inboxes");
      const inboxes = normalizeListPayload(payload).map((item) =>
        normalizeInbox(item)
      );
      for (const inbox of inboxes) {
        if ((inbox.identifier || "").toLowerCase() === normalized) {
          return inbox;
        }
      }

      return null;
    },

    async fetchMessage(messageId: string): Promise<Record<string, unknown>> {
      const payload = await requestJson(
        "GET",
        `/v0/messages/${encodeURIComponent(messageId)}`
      );
      return payload;
    },

    async fetchMessageRaw(messageId: string): Promise<string> {
      const response = await requestRaw(
        "GET",
        `/v0/messages/${encodeURIComponent(messageId)}/raw`,
        { headers: { Accept: "message/rfc822" } }
      );
      return response.text();
    },

    async fetchMessageAttachments(messageId: string): Promise<Record<string, unknown>> {
      const payload = await requestJson(
        "GET",
        `/v0/messages/${encodeURIComponent(messageId)}/attachments`
      );
      return payload;
    },

    async fetchMessageAttachmentBinary(
      messageId: string,
      attachmentId: string
    ): Promise<{
      contentType: string | null;
      filename: string | null;
      bytes: Buffer;
    }> {
      const response = await requestRaw(
        "GET",
        `/v0/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
      );

      const bytes = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type");
      const contentDisposition = response.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i);
      return {
        contentType,
        filename: filenameMatch?.[1] || null,
        bytes,
      };
    },

    async sendMessage(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
      return requestJson("POST", "/v0/send", { body: payload });
    },
  };
}
