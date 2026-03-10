import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCredentialHandle, revealSecretValue } from "@/lib/secrets/handles";
import type { TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import { executeTenantExternalToolInvocation } from "@/lib/runtime/tenant-runtime-tools";

/**
 * Creates the `use_credential` and optionally `reveal_secret` tools.
 *
 * `use_credential` returns an opaque credential handle — NOT the raw secret.
 * `reveal_secret` is a break-glass escape hatch that returns the raw value
 * directly into the LLM context (disabled by default, approval-gated).
 */
export interface CreateCredentialToolsOptions {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  runtimeRun?: TenantRuntimeRun;
  actorRole?: TenantRole;
  actorId: string | null;
  includeRevealSecret: boolean;
  revealedSecretValues?: string[];
}

export function createCredentialTools(opts: CreateCredentialToolsOptions) {
  const { admin, tenantId, customerId, agentId, runtimeRun, actorRole, actorId, includeRevealSecret, revealedSecretValues } = opts;
  const useCredentialTool = tool({
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
          runId: runtimeRun?.id ?? null,
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
  });

  if (!includeRevealSecret || !runtimeRun || !actorRole) {
    return {
      use_credential: useCredentialTool,
    };
  }

  return {
    use_credential: useCredentialTool,
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
          const outcome = await executeTenantExternalToolInvocation(admin, {
            run: runtimeRun,
            toolRequest: {
              toolKey: "reveal_secret",
              args: {
                label,
                reason,
              },
            },
            actorRole,
            actorId,
            executeAllowedTool: async () => {
              const { data: secret, error: lookupError } = await admin
                .from("tenant_secrets")
                .select("id")
                .eq("tenant_id", tenantId)
                .eq("label", label)
                .single();

              if (lookupError || !secret) {
                throw new Error(`Secret "${label}" not found`);
              }

              const result = await revealSecretValue({
                admin,
                tenantId,
                customerId,
                secretId: secret.id,
                agentId,
                runId: runtimeRun.id,
                reason,
              });

              if (revealedSecretValues) {
                revealedSecretValues.push(result.value);
              }

              return {
                label: result.label,
                value: result.value,
                warning:
                  "This raw value is in context. It will be redacted from memory and traces.",
              };
            },
          });

          if (outcome.outcome === "awaiting_approval") {
            return {
              error: "This tool call requires tenant approval before it can run.",
              ...outcome.result,
            };
          }

          if (outcome.outcome === "failed") {
            return {
              error:
                outcome.errorMessage || "This tool call was blocked by tenant policy.",
              ...outcome.result,
            };
          }

          return outcome.result.tool_output &&
            typeof outcome.result.tool_output === "object" &&
            !Array.isArray(outcome.result.tool_output)
            ? (outcome.result.tool_output as Record<string, unknown>)
            : outcome.result;
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Failed to reveal secret",
          };
        }
      },
    }),
  };
}
