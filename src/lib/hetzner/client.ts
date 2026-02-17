import type {
  HetznerClient,
  HetznerServer,
  HetznerAction,
  CreateServerParams,
  CreateServerResult,
} from "./types";
import { MockHetznerClient } from "./mock";

class RealHetznerClient implements HetznerClient {
  private token: string;
  private baseUrl = "https://api.hetzner.cloud/v1";

  constructor(token: string) {
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
      throw new Error(`Hetzner API error ${res.status}: ${body}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async createServer(params: CreateServerParams): Promise<CreateServerResult> {
    const data = await this.request<{
      server: HetznerServer;
      action: HetznerAction;
    }>("/servers", {
      method: "POST",
      body: JSON.stringify(params),
    });

    return { server: data.server, action: data.action };
  }

  async getServer(id: number): Promise<HetznerServer> {
    const data = await this.request<{ server: HetznerServer }>(
      `/servers/${id}`
    );
    return data.server;
  }

  async getAction(id: number): Promise<HetznerAction> {
    const data = await this.request<{ action: HetznerAction }>(
      `/actions/${id}`
    );
    return data.action;
  }

  async deleteServer(id: number): Promise<void> {
    await this.request(`/servers/${id}`, { method: "DELETE" });
  }
}

export function getHetznerClient(): HetznerClient {
  const mode = process.env.HETZNER_API_MODE;

  if (!mode || mode === "mock") {
    return new MockHetznerClient();
  }

  const token = process.env.HETZNER_API_TOKEN;
  if (!token) {
    throw new Error("HETZNER_API_TOKEN is required when HETZNER_API_MODE is not mock");
  }

  return new RealHetznerClient(token);
}
