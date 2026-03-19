export type IntegrationAuthMethod = "api_key" | "bearer" | "basic" | "header";
export type IntegrationStatus = "active" | "inactive" | "error";

export interface DiscoveredEndpoint {
  method: string;
  path: string;
  description: string;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  customer_id: string;
  slug: string;
  display_name: string;
  service_type: string;
  base_url: string | null;
  connector_account_id: string | null;
  auth_method: IntegrationAuthMethod;
  auth_header: string | null;
  api_docs_url: string | null;
  discovered_endpoints: DiscoveredEndpoint[];
  capabilities_summary: string | null;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  last_used_at: string | null;
  last_error: string | null;
  created_by_agent_id: string | null;
  setup_conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantIntegrationSchedule {
  id: string;
  integration_id: string;
  schedule_id: string;
  purpose: string | null;
  created_at: string;
}

export interface IntegrationSummary {
  id: string;
  slug: string;
  display_name: string;
  service_type: string;
  base_url: string | null;
  status: IntegrationStatus;
  capabilities_summary: string | null;
  last_used_at: string | null;
  schedule_count: number;
}
