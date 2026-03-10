import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeCredentialHandle } from "@/lib/secrets/handles";
import { redactValue, redactCommonPatterns } from "@/lib/secrets/redaction";

const MAX_RESPONSE_BODY_LENGTH = 8_000;
const REQUEST_TIMEOUT_MS = 15_000;

// Blocked internal/private ranges
const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(lower)) return true;
  // Block private/link-local ranges
  if (lower.endsWith(".internal") || lower.endsWith(".local")) return true;
  if (/^10\./.test(lower) || /^172\.(1[6-9]|2\d|3[01])\./.test(lower) || /^192\.168\./.test(lower)) return true;
  return false;
}

function isDomainAllowed(hostname: string, allowedDomains: string[] | null): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  const lower = hostname.toLowerCase();
  return allowedDomains.some((d) => {
    const pattern = d.toLowerCase();
    return lower === pattern || lower.endsWith(`.${pattern}`);
  });
}

/**
 * Creates the `http_request` tool with server-side credential injection.
 *
 * When a `credential_handle` is provided, the server decrypts the secret
 * and injects it into the request headers/URL — the LLM never sees the raw value.
 * The response body is also redacted to strip any echoed credentials.
 */
export function createHttpRequestTool(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  agentId: string | null,
  runId: string | null
) {
  return {
    http_request: tool({
      description:
        "Make an HTTP request to an external API. Supports GET, POST, PUT, PATCH, DELETE. " +
        "To authenticate, first call use_credential to get a credential_handle, then pass it here. " +
        "The credential is injected server-side — you never see the raw secret. " +
        "Requests to internal/private networks are blocked.",
      inputSchema: z.object({
        url: z.string().url().describe("The full URL to request"),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .default("GET")
          .describe("HTTP method"),
        headers: z
          .record(z.string(), z.string())
          .optional()
          .describe("Additional headers (do NOT include auth headers — use credential_handle instead)"),
        body: z
          .string()
          .optional()
          .describe("Request body (for POST/PUT/PATCH). Send as string; set Content-Type header if needed."),
        credential_handle: z
          .string()
          .optional()
          .describe("Opaque handle from use_credential tool. Server injects the secret into the request."),
      }),
      execute: async ({ url, method, headers, body, credential_handle }) => {
        try {
          const parsedUrl = new URL(url);

          // SSRF protection
          if (isBlockedHost(parsedUrl.hostname)) {
            return { error: "Requests to internal/private networks are not allowed." };
          }

          // Only allow HTTPS (except for development)
          if (parsedUrl.protocol !== "https:") {
            return { error: "Only HTTPS URLs are allowed." };
          }

          const requestHeaders: Record<string, string> = {
            "User-Agent": "FarmClaw/1.0",
            ...(headers ?? {}),
          };

          let secretValue: string | null = null;

          // Inject credential if handle provided
          if (credential_handle) {
            const credential = await consumeCredentialHandle(admin, credential_handle, tenantId);

            // Domain scoping check
            if (!isDomainAllowed(parsedUrl.hostname, credential.allowedDomains)) {
              // Audit the rejection
              admin.from("tenant_secret_audit_log").insert({
                tenant_id: tenantId,
                customer_id: customerId,
                secret_id: credential.secretId,
                action: "handle_created",
                tool_name: "http_request",
                target_domain: parsedUrl.hostname,
                agent_id: agentId,
                run_id: runId,
                metadata: { rejected: true, reason: "domain_not_allowed" },
              }).then(() => {}).catch((err: unknown) => console.error("Audit log insert failed", err));

              return {
                error: `Credential "${credential_handle}" is not allowed for domain "${parsedUrl.hostname}". ` +
                  `Allowed domains: ${credential.allowedDomains?.join(", ") ?? "none configured"}.`,
              };
            }

            secretValue = credential.value;

            // Inject based on scheme
            switch (credential.scheme) {
              case "bearer":
                requestHeaders["Authorization"] = `Bearer ${credential.value}`;
                break;
              case "basic":
                requestHeaders["Authorization"] = `Basic ${Buffer.from(credential.value).toString("base64")}`;
                break;
              case "header":
                requestHeaders[credential.headerName || "X-API-Key"] = credential.value;
                break;
              case "query_param": {
                const paramName = credential.paramName || "api_key";
                parsedUrl.searchParams.set(paramName, credential.value);
                break;
              }
            }

            // Audit: credential injected
            admin
              .from("tenant_secret_audit_log")
              .insert({
                tenant_id: tenantId,
                customer_id: customerId,
                secret_id: credential.secretId,
                action: "injected",
                tool_name: "http_request",
                target_domain: parsedUrl.hostname,
                agent_id: agentId,
                run_id: runId,
              })
              .then(() => {}).catch((err: unknown) => console.error("Audit log insert failed", err));
          }

          // Execute the request
          const response = await fetch(parsedUrl.toString(), {
            method,
            headers: requestHeaders,
            body: method !== "GET" && method !== "DELETE" ? body : undefined,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });

          let responseBody = await response.text();

          // Truncate long responses
          if (responseBody.length > MAX_RESPONSE_BODY_LENGTH) {
            responseBody = responseBody.slice(0, MAX_RESPONSE_BODY_LENGTH) + "\n[...truncated]";
          }

          // Redact: remove any echoed secret values from the response
          if (secretValue) {
            responseBody = redactValue(responseBody, secretValue);
            responseBody = redactCommonPatterns(responseBody);
          }

          return {
            status: response.status,
            status_text: response.statusText,
            headers: Object.fromEntries(
              [...response.headers.entries()]
                .filter(([key]) => {
                  // Only pass safe response headers
                  const lower = key.toLowerCase();
                  return ["content-type", "x-request-id", "x-ratelimit-remaining", "retry-after"].includes(lower);
                })
            ),
            body: responseBody,
          };
        } catch (err) {
          if (err instanceof Error) {
            if (err.name === "AbortError" || err.name === "TimeoutError") {
              return { error: "Request timed out (15 second limit)." };
            }
            return { error: err.message };
          }
          return { error: "HTTP request failed" };
        }
      },
    }),
  };
}
