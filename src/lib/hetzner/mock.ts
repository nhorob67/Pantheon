import type {
  HetznerClient,
  HetznerServer,
  HetznerAction,
  CreateServerParams,
  CreateServerResult,
} from "./types";

let nextId = 1000;
const mockServers = new Map<number, HetznerServer>();
const mockActions = new Map<number, HetznerAction>();

export class MockHetznerClient implements HetznerClient {
  async createServer(params: CreateServerParams): Promise<CreateServerResult> {
    const serverId = nextId++;
    const actionId = nextId++;

    const server: HetznerServer = {
      id: serverId,
      name: params.name,
      status: "initializing",
      public_net: {
        ipv4: { ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` },
      },
      server_type: { name: params.server_type },
      datacenter: {
        name: `${params.location}-dc1`,
        location: { name: params.location },
      },
      created: new Date().toISOString(),
    };

    const action: HetznerAction = {
      id: actionId,
      status: "running",
      progress: 0,
      error: null,
    };

    mockServers.set(serverId, server);
    mockActions.set(actionId, action);

    // Simulate server becoming ready after 2s
    setTimeout(() => {
      const s = mockServers.get(serverId);
      if (s) s.status = "running";
      const a = mockActions.get(actionId);
      if (a) {
        a.status = "success";
        a.progress = 100;
      }
    }, 2000);

    await new Promise((r) => setTimeout(r, 200));
    return { server, action };
  }

  async getServer(id: number): Promise<HetznerServer> {
    const server = mockServers.get(id);
    if (!server) {
      throw new Error(`Mock Hetzner server ${id} not found`);
    }
    return server;
  }

  async getAction(id: number): Promise<HetznerAction> {
    const action = mockActions.get(id);
    if (!action) {
      throw new Error(`Mock Hetzner action ${id} not found`);
    }
    return action;
  }

  async deleteServer(id: number): Promise<void> {
    mockServers.delete(id);
  }
}
