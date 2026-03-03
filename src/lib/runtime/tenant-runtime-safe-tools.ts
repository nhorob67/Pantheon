import { createHash, randomUUID } from "node:crypto";

export interface RuntimeSafeToolExecutionResult {
  output: Record<string, unknown>;
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringifyToolInput(args: Record<string, unknown>): string {
  const directValue = asNonEmptyString(args.value);
  if (directValue) {
    return directValue;
  }
  return JSON.stringify(args);
}

function decodeBase64Strict(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error("base64_decode requires a non-empty base64 payload");
  }
  if (normalized.length % 4 !== 0 || !BASE64_PATTERN.test(normalized)) {
    throw new Error("base64_decode received invalid base64 content");
  }
  return Buffer.from(normalized, "base64").toString("utf8");
}

export async function executeRuntimeSafeTool(
  toolKey: string,
  args: Record<string, unknown>
): Promise<RuntimeSafeToolExecutionResult> {
  switch (toolKey) {
    case "echo":
      return {
        output: {
          message:
            typeof args.message === "string" && args.message.trim().length > 0
              ? args.message
              : "",
        },
      };
    case "time":
      return {
        output: {
          iso_time: new Date().toISOString(),
        },
      };
    case "hash": {
      const value = stringifyToolInput(args);
      return {
        output: {
          sha256: createHash("sha256").update(value).digest("hex"),
        },
      };
    }
    case "uuid":
      return {
        output: {
          uuid: randomUUID(),
        },
      };
    case "base64_encode": {
      const value = stringifyToolInput(args);
      return {
        output: {
          base64: Buffer.from(value, "utf8").toString("base64"),
        },
      };
    }
    case "base64_decode": {
      const payload = asNonEmptyString(args.base64);
      if (!payload) {
        throw new Error("base64_decode requires a base64 field");
      }
      return {
        output: {
          value: decodeBase64Strict(payload),
        },
      };
    }
    default:
      throw new Error(`Unsupported runtime tool: ${toolKey}`);
  }
}
