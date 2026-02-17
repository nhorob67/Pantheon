import type {
  CoolifyClient,
  CoolifyApplication,
  CoolifyServer,
  CreateApplicationParams,
  AddServerParams,
} from "./types";
import { MockCoolifyClient } from "./mock";

class RealCoolifyClient implements CoolifyClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Coolify API error ${res.status}: ${body}`);
    }

    return res.json();
  }

  async createApplication(
    params: CreateApplicationParams
  ): Promise<CoolifyApplication> {
    const envVarList = Object.entries(params.envVars).map(([key, value]) => ({
      key,
      value,
      is_build_time: false,
    }));

    const payload: Record<string, unknown> = {
      project_uuid: params.projectUuid,
      server_uuid: params.serverUuid,
      environment_name: params.environmentName,
      name: params.name,
      docker_registry_image_name: params.image,
      ports_mappings: "18789:18789",
      environment: envVarList,
    };

    if (params.persistentStorages && params.persistentStorages.length > 0) {
      payload.persistent_storages = params.persistentStorages.map((storage) => ({
        host_path: storage.hostPath,
        mount_path: storage.mountPath,
      }));
    }

    const app = await this.request<CoolifyApplication>(
      "/api/v1/applications",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    return app;
  }

  async startApplication(uuid: string): Promise<void> {
    await this.request(`/api/v1/applications/${uuid}/start`, {
      method: "POST",
    });
  }

  async stopApplication(uuid: string): Promise<void> {
    await this.request(`/api/v1/applications/${uuid}/stop`, {
      method: "POST",
    });
  }

  async restartApplication(uuid: string): Promise<void> {
    await this.request(`/api/v1/applications/${uuid}/restart`, {
      method: "POST",
    });
  }

  async getApplication(uuid: string): Promise<CoolifyApplication> {
    return this.request(`/api/v1/applications/${uuid}`);
  }

  async deleteApplication(uuid: string): Promise<void> {
    await this.request(`/api/v1/applications/${uuid}`, { method: "DELETE" });
  }

  async updateEnvVars(
    uuid: string,
    envVars: Record<string, string>
  ): Promise<void> {
    for (const [key, value] of Object.entries(envVars)) {
      await this.request(`/api/v1/applications/${uuid}/envs`, {
        method: "POST",
        body: JSON.stringify({ key, value, is_build_time: false }),
      });
    }
  }

  async listApplications(): Promise<CoolifyApplication[]> {
    return this.request("/api/v1/applications");
  }

  async addServer(params: AddServerParams): Promise<CoolifyServer> {
    return this.request("/api/v1/servers", {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        ip: params.ip,
        user: params.user,
        port: params.port,
        private_key_uuid: params.private_key_uuid,
        instant_validate: params.instant_validate,
      }),
    });
  }

  async getServer(uuid: string): Promise<CoolifyServer> {
    return this.request(`/api/v1/servers/${uuid}`);
  }

  async validateServer(
    uuid: string
  ): Promise<{ is_reachable: boolean; is_usable: boolean }> {
    return this.request(`/api/v1/servers/${uuid}/validate`);
  }

  async deleteServer(uuid: string): Promise<void> {
    await this.request(`/api/v1/servers/${uuid}`, { method: "DELETE" });
  }
}

export function getCoolifyClient(): CoolifyClient {
  const apiUrl = process.env.COOLIFY_API_URL;

  if (!apiUrl || apiUrl === "mock") {
    return new MockCoolifyClient();
  }

  return new RealCoolifyClient(apiUrl, process.env.COOLIFY_API_TOKEN!);
}
