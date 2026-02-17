import type {
  ComposioClient,
  ComposioEntity,
  ComposioMcpServer,
  ComposioOAuthResult,
  ComposioConnectionAccount,
} from "./client";

const mockConnections = new Map<string, ComposioConnectionAccount[]>();

export class MockComposioClient implements ComposioClient {
  async createEntity(userId: string): Promise<ComposioEntity> {
    await new Promise((r) => setTimeout(r, 200));
    return { id: `entity-${userId}`, user_id: userId };
  }

  async getMcpUrl(userId: string): Promise<ComposioMcpServer> {
    await new Promise((r) => setTimeout(r, 300));
    const serverId = `mock-mcp-${Date.now()}`;
    return {
      server_id: serverId,
      url: `https://backend.composio.dev/v3/mcp/${serverId}?user_id=${encodeURIComponent(userId)}`,
    };
  }

  async initiateOAuthConnection(
    userId: string,
    appId: string,
    redirectUrl: string
  ): Promise<ComposioOAuthResult> {
    await new Promise((r) => setTimeout(r, 200));

    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Simulate successful connection
    const existing = mockConnections.get(userId) || [];
    existing.push({
      id: connectionId,
      app_id: appId,
      app_name: appId,
      status: "ACTIVE",
      account_identifier: `mock-${appId}@example.com`,
      created_at: new Date().toISOString(),
    });
    mockConnections.set(userId, existing);

    return {
      redirect_url: `${redirectUrl}?mock=true&connection_id=${connectionId}`,
      connection_id: connectionId,
    };
  }

  async getConnectedAccounts(
    userId: string
  ): Promise<ComposioConnectionAccount[]> {
    await new Promise((r) => setTimeout(r, 150));
    return mockConnections.get(userId) || [];
  }

  async disconnectApp(connectionId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
    for (const [userId, accounts] of mockConnections) {
      const filtered = accounts.filter((a) => a.id !== connectionId);
      if (filtered.length !== accounts.length) {
        mockConnections.set(userId, filtered);
        break;
      }
    }
  }
}
