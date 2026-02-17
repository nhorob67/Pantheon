export interface ComposioConnectedApp {
  app_id: string;
  app_name: string;
  status: "connected" | "disconnected" | "expired" | "pending";
  account_identifier: string | null;
  connected_at: string | null;
}

export interface ComposioConfig {
  id: string;
  customer_id: string;
  instance_id: string | null;
  composio_user_id: string;
  enabled: boolean;
  selected_toolkits: string[];
  connected_apps: ComposioConnectedApp[];
  mcp_server_url: string | null;
  composio_server_id: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComposioToolkit {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "recommended" | "productivity" | "communication" | "data";
  requires_auth: boolean;
  recommended: boolean;
  actions: string[];
}
