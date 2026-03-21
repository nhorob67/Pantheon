import { z } from "zod/v4";

const slugFormat = z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

export const integrationStoreCredentialSchema = z.object({
  service_slug: slugFormat,
  api_key: z.string().min(1).max(10_000),
  auth_method: z.enum(["api_key", "bearer", "basic", "header", "multi_header"]).default("api_key"),
  auth_header: z.string().min(1).max(200).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const integrationRegisterSchema = z.object({
  slug: slugFormat,
  display_name: z.string().min(1).max(200),
  service_type: z.string().min(1).max(100),
  base_url: z.string().url().optional(),
  connector_account_id: z.string().uuid().optional(),
  auth_method: z.enum(["api_key", "bearer", "basic", "header", "multi_header"]).default("api_key"),
  auth_header: z.string().min(1).max(200).optional(),
  api_docs_url: z.string().url().optional(),
  discovered_endpoints: z
    .array(
      z.object({
        method: z.string().min(1).max(10),
        path: z.string().min(1).max(500),
        description: z.string().max(500),
      })
    )
    .max(100)
    .optional(),
  capabilities_summary: z.string().max(2000).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const integrationApiCallSchema = z.object({
  integration_slug: slugFormat,
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().min(1).max(2000).regex(/^\//),
  query_params: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const integrationListSchema = z.object({
  status: z.enum(["active", "inactive", "error"]).optional(),
});

export const integrationUpdateSchema = z.object({
  display_name: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  base_url: z.string().url().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
