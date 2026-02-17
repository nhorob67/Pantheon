import { decrypt, encrypt } from "@/lib/crypto";

export type ConnectorSecretAuthType = "api_key" | "oauth2" | "token";

export interface ConnectorSecretPayload {
  auth_type: ConnectorSecretAuthType;
  api_key?: string;
  access_token?: string;
  refresh_token?: string;
  token?: string;
  expires_at?: string;
  scopes?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

interface ConnectorSecretEnvelope {
  version: 1;
  created_at: string;
  payload: ConnectorSecretPayload;
}

const CONNECTOR_SECRET_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid connector secret field: ${fieldName}`);
  }

  return value.trim();
}

function validatePayload(payload: unknown): ConnectorSecretPayload {
  if (!isRecord(payload)) {
    throw new Error("Invalid connector secret payload");
  }

  const authType = assertNonEmptyString(payload.auth_type, "auth_type");

  if (authType !== "api_key" && authType !== "oauth2" && authType !== "token") {
    throw new Error("Invalid connector auth_type");
  }

  const normalized: ConnectorSecretPayload = {
    auth_type: authType,
  };

  if (payload.api_key) {
    normalized.api_key = assertNonEmptyString(payload.api_key, "api_key");
  }
  if (payload.access_token) {
    normalized.access_token = assertNonEmptyString(payload.access_token, "access_token");
  }
  if (payload.refresh_token) {
    normalized.refresh_token = assertNonEmptyString(payload.refresh_token, "refresh_token");
  }
  if (payload.token) {
    normalized.token = assertNonEmptyString(payload.token, "token");
  }
  if (payload.expires_at) {
    normalized.expires_at = assertNonEmptyString(payload.expires_at, "expires_at");
  }
  if (payload.scopes) {
    if (!Array.isArray(payload.scopes)) {
      throw new Error("Invalid connector secret field: scopes");
    }

    normalized.scopes = payload.scopes
      .map((scope) => assertNonEmptyString(scope, "scopes"))
      .filter((value, index, list) => list.indexOf(value) === index);
  }
  if (payload.metadata) {
    if (!isRecord(payload.metadata)) {
      throw new Error("Invalid connector secret field: metadata");
    }

    const metadata: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(payload.metadata)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        metadata[key] = value;
      } else {
        throw new Error("Invalid connector secret field: metadata");
      }
    }

    normalized.metadata = metadata;
  }

  if (authType === "api_key" && !normalized.api_key) {
    throw new Error("api_key auth_type requires api_key");
  }
  if (
    authType === "oauth2" &&
    !normalized.access_token &&
    !normalized.refresh_token
  ) {
    throw new Error("oauth2 auth_type requires access_token or refresh_token");
  }
  if (authType === "token" && !normalized.token) {
    throw new Error("token auth_type requires token");
  }

  return normalized;
}

function parseConnectorSecretEnvelope(raw: string): ConnectorSecretEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid encrypted connector secret payload");
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid encrypted connector secret payload");
  }

  if (parsed.version !== CONNECTOR_SECRET_VERSION) {
    throw new Error("Unsupported connector secret version");
  }

  if (typeof parsed.created_at !== "string" || parsed.created_at.length === 0) {
    throw new Error("Invalid connector secret created_at");
  }

  if (!isRecord(parsed.payload)) {
    throw new Error("Invalid connector secret payload");
  }

  const payload = validatePayload(parsed.payload);
  return {
    version: CONNECTOR_SECRET_VERSION,
    created_at: parsed.created_at,
    payload,
  };
}

export function encryptConnectorSecret(payload: ConnectorSecretPayload): string {
  const normalizedPayload = validatePayload(payload);
  const envelope: ConnectorSecretEnvelope = {
    version: CONNECTOR_SECRET_VERSION,
    created_at: new Date().toISOString(),
    payload: normalizedPayload,
  };

  return encrypt(JSON.stringify(envelope));
}

export function decryptConnectorSecret(encoded: string): ConnectorSecretPayload {
  const raw = decrypt(encoded);
  const envelope = parseConnectorSecretEnvelope(raw);
  return envelope.payload;
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return `${secret.slice(0, 2)}***${secret.slice(-1)}`;
  }

  return `${secret.slice(0, 4)}***${secret.slice(-3)}`;
}

export function deriveConnectorSecretHint(payload: ConnectorSecretPayload): string {
  const normalized = validatePayload(payload);

  if (normalized.api_key) {
    return `api_key:${maskSecret(normalized.api_key)}`;
  }
  if (normalized.access_token) {
    return `oauth2_access:${maskSecret(normalized.access_token)}`;
  }
  if (normalized.refresh_token) {
    return `oauth2_refresh:${maskSecret(normalized.refresh_token)}`;
  }
  if (normalized.token) {
    return `token:${maskSecret(normalized.token)}`;
  }

  return `${normalized.auth_type}:configured`;
}
