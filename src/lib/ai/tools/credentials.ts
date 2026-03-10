import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCredentialHandle, revealSecretValue } from "@/lib/secrets/handles";

/**
 * Creates the `use_credential` and optionally `reveal_secret` tools.
 *
 * `use_credential` returns an opaque credential handle — NOT the raw secret.
 * `reveal_secret` is a break-glass escape hatch that returns the raw value
 * directly into the LLM context (disabled by default, approval-gated).
 */
export function createCredentialTools(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  agentId: string | null,
  runId: string | null,
  revealedSecretValues?: string[]
) {
  return {
    use_credential: tool({
      description:
        "Get a credential handle for a stored secret. Returns an opaque handle ID " +
        "that can be passed to the http_request tool via the credential_handle parameter. " +
        "The raw secret value is NEVER returned — it is injected server-side into HTTP requests. " +
        "Use this when you need to call an external API that requires authentication.",
      inputSchema: z.object({
        label: z
          .string()
          .describe(
            "The label of the stored secret (e.g., 'climate-fieldview', 'my-weather-api')"
          ),
        purpose: z
          .enum(["http"])
          .default("http")
          .describe("How the credential will be used. Currently only 'http' is supported."),
      }),
      execute: async ({ label, purpose }) => {
        try {
          const result = await createCredentialHandle({
            admin,
            tenantId,
            customerId,
            label,
            agentId,
            purpose,
            runId,
          });

          return {
            credential_handle: result.handleId,
            label: result.label,
            inject_scheme: result.inject_scheme,
            allowed_domains: result.allowed_domains,
            note: "Pass this credential_handle to the http_request tool. The secret will be injected server-side.",
          };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Failed to create credential handle",
          };
        }
      },
    }),

    reveal_secret: tool({
      description:
        "BREAK-GLASS: Reveal the raw value of a stored secret. This puts the actual credential " +
        "directly into the conversation context. Only use this when credential injection via " +
        "http_request is not possible (e.g., the API key must be in the request body). " +
        "Requires owner approval. The revealed value will be redacted from stored messages.",
      inputSchema: z.object({
        label: z
          .string()
          .describe("The label of the secret to reveal"),
        reason: z
          .string()
          .describe(
            "Mandatory justification for why break-glass access is needed (logged in audit trail)"
          ),
      }),
      execute: async ({ label, reason }) => {
        try {
          // Look up secret by label to get the ID
          const { data: secret, error: lookupError } = await admin
            .from("tenant_secrets")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("label", label)
            .single();

          if (lookupError || !secret) {
            return { error: `Secret "${label}" not found` };
          }

          const result = await revealSecretValue({
            admin,
            tenantId,
            customerId,
            secretId: secret.id,
            agentId,
            runId,
            reason,
          });

          // Track for post-turn redaction
          if (revealedSecretValues) {
            revealedSecretValues.push(result.value);
          }

          return {
            label: result.label,
            value: result.value,
            warning:
              "This raw value is in context. It will be redacted from memory and traces.",
          };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Failed to reveal secret",
          };
        }
      },
    }),
  };
}
