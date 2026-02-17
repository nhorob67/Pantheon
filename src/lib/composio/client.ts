import { MockComposioClient } from "./mock";

export interface ComposioEntity {
  id: string;
  user_id: string;
}

export interface ComposioMcpServer {
  server_id: string;
  url: string;
}

export interface ComposioConnectionAccount {
  id: string;
  app_id: string;
  app_name: string;
  status: "ACTIVE" | "EXPIRED" | "FAILED" | "INITIATED";
  account_identifier: string | null;
  created_at: string;
}

export interface ComposioOAuthResult {
  redirect_url: string;
  connection_id: string;
}

export interface ComposioClient {
  createEntity(userId: string): Promise<ComposioEntity>;
  getMcpUrl(userId: string): Promise<ComposioMcpServer>;
  initiateOAuthConnection(
    userId: string,
    appId: string,
    redirectUrl: string
  ): Promise<ComposioOAuthResult>;
  getConnectedAccounts(userId: string): Promise<ComposioConnectionAccount[]>;
  disconnectApp(connectionId: string): Promise<void>;
}

class RealComposioClient implements ComposioClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Composio API error ${res.status}: ${body}`);
    }

    return res.json();
  }

  async createEntity(userId: string): Promise<ComposioEntity> {
    return this.request("/api/v1/entities", {
      method: "POST",
      body: JSON.stringify({ id: userId }),
    });
  }

  async getMcpUrl(userId: string): Promise<ComposioMcpServer> {
    const result = await this.request<{ id: string; url: string }>(
      `/api/v1/mcp/servers`,
      {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      }
    );
    return { server_id: result.id, url: result.url };
  }

  async initiateOAuthConnection(
    userId: string,
    appId: string,
    redirectUrl: string
  ): Promise<ComposioOAuthResult> {
    return this.request("/api/v1/connectedAccounts", {
      method: "POST",
      body: JSON.stringify({
        entityId: userId,
        appName: appId,
        redirectUri: redirectUrl,
        type: "oauth2",
      }),
    });
  }

  async getConnectedAccounts(
    userId: string
  ): Promise<ComposioConnectionAccount[]> {
    const result = await this.request<{ items: ComposioConnectionAccount[] }>(
      `/api/v1/connectedAccounts?user_id=${encodeURIComponent(userId)}`
    );
    return result.items || [];
  }

  async disconnectApp(connectionId: string): Promise<void> {
    await this.request(`/api/v1/connectedAccounts/${connectionId}`, {
      method: "DELETE",
    });
  }
}

export function getComposioClient(): ComposioClient {
  const apiUrl = process.env.COMPOSIO_API_URL;

  if (!apiUrl || apiUrl === "mock") {
    return new MockComposioClient();
  }

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is required");
  }

  return new RealComposioClient(apiUrl, apiKey);
}
