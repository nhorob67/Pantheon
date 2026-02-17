import type {
  CoolifyClient,
  CoolifyApplication,
  CoolifyServer,
  CreateApplicationParams,
  AddServerParams,
} from "./types";

const mockApps = new Map<string, CoolifyApplication>();
const mockServers = new Map<string, CoolifyServer>();

export class MockCoolifyClient implements CoolifyClient {
  async createApplication(
    params: CreateApplicationParams
  ): Promise<CoolifyApplication> {
    const uuid = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const app: CoolifyApplication = {
      uuid,
      name: params.name,
      status: "running",
      fqdn: null,
    };
    mockApps.set(uuid, app);
    // Simulate provisioning delay
    await new Promise((r) => setTimeout(r, 500));
    return app;
  }

  async startApplication(uuid: string): Promise<void> {
    const app = mockApps.get(uuid);
    if (app) app.status = "running";
    await new Promise((r) => setTimeout(r, 300));
  }

  async stopApplication(uuid: string): Promise<void> {
    const app = mockApps.get(uuid);
    if (app) app.status = "stopped";
    await new Promise((r) => setTimeout(r, 300));
  }

  async restartApplication(uuid: string): Promise<void> {
    const app = mockApps.get(uuid);
    if (app) app.status = "running";
    await new Promise((r) => setTimeout(r, 500));
  }

  async getApplication(uuid: string): Promise<CoolifyApplication> {
    const app = mockApps.get(uuid);
    if (!app) {
      return { uuid, name: "unknown", status: "not_found", fqdn: null };
    }
    return app;
  }

  async deleteApplication(uuid: string): Promise<void> {
    mockApps.delete(uuid);
  }

  async updateEnvVars(
    _uuid: string,
    _envVars: Record<string, string>
  ): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
  }

  async listApplications(): Promise<CoolifyApplication[]> {
    return Array.from(mockApps.values());
  }

  async addServer(params: AddServerParams): Promise<CoolifyServer> {
    const uuid = `mock-srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const server: CoolifyServer = {
      uuid,
      name: params.name,
      ip: params.ip,
      user: params.user,
      port: params.port,
      is_reachable: params.instant_validate,
      is_usable: params.instant_validate,
    };
    mockServers.set(uuid, server);
    await new Promise((r) => setTimeout(r, 300));
    return server;
  }

  async getServer(uuid: string): Promise<CoolifyServer> {
    const server = mockServers.get(uuid);
    if (!server) {
      return {
        uuid,
        name: "unknown",
        ip: "0.0.0.0",
        user: "root",
        port: 22,
        is_reachable: false,
        is_usable: false,
      };
    }
    return server;
  }

  async validateServer(
    uuid: string
  ): Promise<{ is_reachable: boolean; is_usable: boolean }> {
    const server = mockServers.get(uuid);
    if (server) {
      server.is_reachable = true;
      server.is_usable = true;
    }
    await new Promise((r) => setTimeout(r, 200));
    return { is_reachable: true, is_usable: true };
  }

  async deleteServer(uuid: string): Promise<void> {
    mockServers.delete(uuid);
  }
}
