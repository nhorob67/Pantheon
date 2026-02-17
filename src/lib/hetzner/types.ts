export interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4: {
      ip: string;
    };
  };
  server_type: {
    name: string;
  };
  datacenter: {
    name: string;
    location: {
      name: string;
    };
  };
  created: string;
}

export interface HetznerAction {
  id: number;
  status: "running" | "success" | "error";
  progress: number;
  error: { code: string; message: string } | null;
}

export interface CreateServerParams {
  name: string;
  server_type: string;
  location: string;
  image: string;
  ssh_keys: number[];
  user_data: string;
  labels: Record<string, string>;
  firewalls?: { firewall: number }[];
}

export interface CreateServerResult {
  server: HetznerServer;
  action: HetznerAction;
}

export interface HetznerClient {
  createServer(params: CreateServerParams): Promise<CreateServerResult>;
  getServer(id: number): Promise<HetznerServer>;
  getAction(id: number): Promise<HetznerAction>;
  deleteServer(id: number): Promise<void>;
}
