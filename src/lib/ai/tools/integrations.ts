import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  storeIntegrationCredential,
  registerIntegration,
  listIntegrations,
  executeIntegrationApiCall,
} from "@/lib/runtime/tenant-integrations";
import { findTemplate, getTemplateList } from "@/lib/runtime/integration-templates";

export interface CreateIntegrationToolsInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  runId: string | null;
}

export function createIntegrationTools(input: CreateIntegrationToolsInput) {
  const { admin, tenantId, customerId, agentId, runId } = input;

  return {
    integration_store_credential: tool({
      description:
        "Securely store an API key or token for an external service integration. " +
        "The credential is encrypted at rest and never exposed in conversation. " +
        "Call this FIRST when setting up a new integration, after the user provides their API key. " +
        "Then call integration_register to complete the setup.",
      inputSchema: z.object({
        service_slug: z
          .string()
          .regex(/^[a-z0-9][a-z0-9-]{0,63}$/)
          .describe("Lowercase slug for the service (e.g., 'discourse', 'github', 'jira')"),
        api_key: z
          .string()
          .min(1)
          .describe("The API key or token provided by the user"),
        auth_method: z
          .enum(["api_key", "bearer", "basic", "header"])
          .default("api_key")
          .describe("How the credential is sent: 'api_key' (custom header), 'bearer' (Authorization: Bearer), 'basic' (Basic auth), 'header' (custom header name)"),
        auth_header: z
          .string()
          .optional()
          .describe("Custom header name when auth_method is 'api_key' or 'header' (e.g., 'Api-Key', 'X-API-Token'). Defaults to 'Api-Key'."),
      }),
      execute: async ({ service_slug, api_key, auth_method, auth_header }) => {
        try {
          const result = await storeIntegrationCredential({
            admin,
            tenantId,
            customerId,
            agentId,
            serviceSlug: service_slug,
            apiKey: api_key,
            authMethod: auth_method,
            authHeader: auth_header,
          });

          return {
            success: true,
            secret_id: result.secret_id,
            label: result.label,
            hint: result.value_hint,
            next_step: "Now call integration_register to register the integration with its base URL and discovered API details.",
          };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Failed to store credential",
          };
        }
      },
    }),

    integration_register: tool({
      description:
        "Register a new external service integration after storing its credential. " +
        "Include the base URL, service type, and any API details you discovered via web_search/web_fetch. " +
        "After registering, test the connection with integration_api_call, then offer to set up scheduled jobs.",
      inputSchema: z.object({
        slug: z
          .string()
          .regex(/^[a-z0-9][a-z0-9-]{0,63}$/)
          .describe("Same slug used in integration_store_credential"),
        display_name: z.string().describe("Human-readable name (e.g., 'Fullstack Ag Discourse')"),
        service_type: z.string().describe("Service type (e.g., 'discourse', 'github', 'jira', 'generic-rest')"),
        base_url: z.string().url().optional().describe("Base URL for API calls (e.g., 'https://community.example.com')"),
        auth_method: z
          .enum(["api_key", "bearer", "basic", "header"])
          .default("api_key")
          .describe("How the credential is sent"),
        auth_header: z.string().optional().describe("Custom auth header name if applicable"),
        api_docs_url: z.string().url().optional().describe("URL of the API documentation you found"),
        discovered_endpoints: z
          .array(
            z.object({
              method: z.string().describe("HTTP method (GET, POST, etc.)"),
              path: z.string().describe("Endpoint path (e.g., '/api/v1/topics')"),
              description: z.string().describe("What this endpoint does"),
            })
          )
          .optional()
          .describe("Key API endpoints you discovered from documentation"),
        capabilities_summary: z
          .string()
          .optional()
          .describe("Brief summary of what this API can do"),
      }),
      execute: async ({
        slug,
        display_name,
        service_type,
        base_url,
        auth_method,
        auth_header,
        api_docs_url,
        discovered_endpoints,
        capabilities_summary,
      }) => {
        try {
          const integration = await registerIntegration({
            admin,
            tenantId,
            customerId,
            agentId,
            slug,
            displayName: display_name,
            serviceType: service_type,
            baseUrl: base_url,
            authMethod: auth_method,
            authHeader: auth_header,
            apiDocsUrl: api_docs_url,
            discoveredEndpoints: discovered_endpoints,
            capabilitiesSummary: capabilities_summary,
          });

          return {
            success: true,
            integration_id: integration.id,
            slug: integration.slug,
            status: integration.status,
            next_step: "Test the connection with integration_api_call, then offer to set up scheduled jobs with schedule_create.",
          };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Failed to register integration",
          };
        }
      },
    }),

    integration_list: tool({
      description:
        "List all configured external service integrations. Shows connection status, " +
        "capabilities, and linked scheduled jobs for each integration.",
      inputSchema: z.object({
        status: z
          .enum(["active", "inactive", "error"])
          .optional()
          .describe("Filter by status (omit to show all)"),
      }),
      execute: async ({ status }) => {
        try {
          const integrations = await listIntegrations(admin, tenantId, status);
          if (integrations.length === 0) {
            return {
              integrations: [],
              message: "No integrations configured yet. Ask the user for an API key to set one up.",
            };
          }
          return { integrations };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Failed to list integrations",
          };
        }
      },
    }),

    integration_api_call: tool({
      description:
        "Make an authenticated API call to a configured integration. " +
        "Credentials are automatically injected server-side — never include API keys in your request. " +
        "Specify the integration by its slug and provide the path relative to the base URL.",
      inputSchema: z.object({
        integration_slug: z
          .string()
          .describe("Slug of the integration to call (e.g., 'discourse')"),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .default("GET")
          .describe("HTTP method"),
        path: z
          .string()
          .describe("API path starting with '/' (e.g., '/admin/dashboard.json')"),
        query_params: z
          .record(z.string(), z.string())
          .optional()
          .describe("URL query parameters"),
        body: z
          .string()
          .optional()
          .describe("Request body (for POST/PUT/PATCH). JSON string."),
        headers: z
          .record(z.string(), z.string())
          .optional()
          .describe("Additional headers (do NOT include auth headers — they are injected automatically)"),
      }),
      execute: async ({ integration_slug, method, path, query_params, body, headers }) => {
        try {
          return await executeIntegrationApiCall({
            admin,
            tenantId,
            customerId,
            agentId,
            runId,
            integrationSlug: integration_slug,
            method,
            path,
            queryParams: query_params,
            body,
            headers,
          });
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Integration API call failed",
          };
        }
      },
    }),

    integration_templates: tool({
      description:
        "Look up pre-built integration templates for common services (Discourse, GitHub, Jira, Linear, Slack, Notion). " +
        "Returns base URLs, auth methods, known endpoints, and setup instructions so you don't need to research the API from scratch. " +
        "Call with no arguments to list all available templates, or pass a slug to get full details for one service.",
      inputSchema: z.object({
        slug: z
          .string()
          .optional()
          .describe("Service slug to look up (e.g., 'github'). Omit to list all available templates."),
      }),
      execute: async ({ slug }) => {
        if (slug) {
          const template = findTemplate(slug);
          if (!template) {
            return {
              error: `No template found for "${slug}".`,
              available: getTemplateList().map((t) => t.slug),
            };
          }
          return { template };
        }
        return { templates: getTemplateList() };
      },
    }),
  };
}
