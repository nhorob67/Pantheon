import {
  __name,
  init_esm
} from "./chunk-262SQFPS.mjs";

// src/lib/email/providers/agentmail.ts
init_esm();
var DEFAULT_AGENTMAIL_API_BASE_URL = "https://api.agentmail.to";
var AgentMailConfigurationError = class extends Error {
  static {
    __name(this, "AgentMailConfigurationError");
  }
};
var AgentMailRequestError = class extends Error {
  static {
    __name(this, "AgentMailRequestError");
  }
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
};
function getPathValue(source, path) {
  let current = source;
  for (const part of path) {
    if (!current || typeof current !== "object") return null;
    current = current[part];
  }
  return current;
}
__name(getPathValue, "getPathValue");
function firstString(source, paths) {
  for (const path of paths) {
    const value = getPathValue(source, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}
__name(firstString, "firstString");
function normalizeInbox(raw) {
  const id = firstString(raw, [["id"], ["data", "id"], ["inbox", "id"]]);
  if (!id) {
    throw new Error("AgentMail inbox response did not include an id");
  }
  const identifier = firstString(raw, [
    ["identifier"],
    ["data", "identifier"],
    ["inbox", "identifier"],
    ["slug"],
    ["data", "slug"]
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
    ["inbox", "address"]
  ]);
  return {
    id,
    identifier,
    emailAddress,
    raw
  };
}
__name(normalizeInbox, "normalizeInbox");
function normalizeListPayload(payload) {
  if (Array.isArray(payload.data)) {
    return payload.data.filter(
      (item) => !!item && typeof item === "object"
    );
  }
  if (Array.isArray(payload.items)) {
    return payload.items.filter(
      (item) => !!item && typeof item === "object"
    );
  }
  if (Array.isArray(payload.inboxes)) {
    return payload.inboxes.filter(
      (item) => !!item && typeof item === "object"
    );
  }
  return [];
}
__name(normalizeListPayload, "normalizeListPayload");
function createAgentMailClient(options = {}) {
  const apiKey = options.apiKey || process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    throw new AgentMailConfigurationError("AGENTMAIL_API_KEY is not configured");
  }
  const baseUrl = (options.apiBaseUrl || process.env.AGENTMAIL_API_BASE_URL || DEFAULT_AGENTMAIL_API_BASE_URL).replace(/\/+$/, "");
  async function requestJson(method, path, init) {
    const response = await requestRaw(method, path, init);
    const text = await response.text();
    let payload = {};
    if (text.length > 0) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }
    if (!response.ok) {
      const detail = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : `AgentMail request failed with status ${response.status}`;
      throw new AgentMailRequestError(detail, response.status, payload);
    }
    if (!payload || typeof payload !== "object") {
      return {};
    }
    return payload;
  }
  __name(requestJson, "requestJson");
  async function requestRaw(method, path, init) {
    const headers = new Headers({
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "User-Agent": "farmclaw-agentmail-client/1.0"
    });
    if (init?.headers) {
      for (const [key, value] of Object.entries(init.headers)) {
        headers.set(key, value);
      }
    }
    let body;
    if (init?.body) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(init.body);
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body,
      cache: "no-store"
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
  __name(requestRaw, "requestRaw");
  return {
    async createInbox(input) {
      const payload = await requestJson("POST", "/v0/inboxes", {
        body: {
          identifier: input.identifier,
          purpose: input.purpose || "transactional",
          metadata: input.metadata || {}
        }
      });
      return normalizeInbox(payload);
    },
    async listInboxes() {
      const payload = await requestJson("GET", "/v0/inboxes");
      return normalizeListPayload(payload).map((item) => normalizeInbox(item));
    },
    async getInbox(inboxId) {
      const payload = await requestJson(
        "GET",
        `/v0/inboxes/${encodeURIComponent(inboxId)}`
      );
      return normalizeInbox(payload);
    },
    async findInboxByIdentifier(identifier) {
      const normalized = identifier.trim().toLowerCase();
      if (!normalized) return null;
      const payload = await requestJson("GET", "/v0/inboxes");
      const inboxes = normalizeListPayload(payload).map(
        (item) => normalizeInbox(item)
      );
      for (const inbox of inboxes) {
        if ((inbox.identifier || "").toLowerCase() === normalized) {
          return inbox;
        }
      }
      return null;
    },
    async fetchMessage(messageId) {
      const payload = await requestJson(
        "GET",
        `/v0/messages/${encodeURIComponent(messageId)}`
      );
      return payload;
    },
    async fetchMessageRaw(messageId) {
      const response = await requestRaw(
        "GET",
        `/v0/messages/${encodeURIComponent(messageId)}/raw`,
        { headers: { Accept: "message/rfc822" } }
      );
      return response.text();
    },
    async fetchMessageAttachments(messageId) {
      const payload = await requestJson(
        "GET",
        `/v0/messages/${encodeURIComponent(messageId)}/attachments`
      );
      return payload;
    },
    async fetchMessageAttachmentBinary(messageId, attachmentId) {
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
        bytes
      };
    },
    async sendMessage(payload) {
      return requestJson("POST", "/v0/send", { body: payload });
    }
  };
}
__name(createAgentMailClient, "createAgentMailClient");

export {
  createAgentMailClient
};
//# sourceMappingURL=chunk-FNDDZUO5.mjs.map
