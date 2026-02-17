export interface CoolifyApplication {
  uuid: string;
  name: string;
  status: string;
  fqdn: string | null;
}

export interface CreateApplicationParams {
  name: string;
  image: string;
  envVars: Record<string, string>;
  serverUuid: string;
  projectUuid: string;
  environmentName: string;
  persistentStorages?: { hostPath: string; mountPath: string }[];
}

export interface CoolifyServer {
  uuid: string;
  name: string;
  ip: string;
  user: string;
  port: number;
  is_reachable: boolean;
  is_usable: boolean;
}

export interface AddServerParams {
  name: string;
  ip: string;
  user: string;
  port: number;
  private_key_uuid: string;
  instant_validate: boolean;
}

export interface CoolifyClient {
  createApplication(params: CreateApplicationParams): Promise<CoolifyApplication>;
  startApplication(uuid: string): Promise<void>;
  stopApplication(uuid: string): Promise<void>;
  restartApplication(uuid: string): Promise<void>;
  getApplication(uuid: string): Promise<CoolifyApplication>;
  deleteApplication(uuid: string): Promise<void>;
  updateEnvVars(uuid: string, envVars: Record<string, string>): Promise<void>;
  listApplications(): Promise<CoolifyApplication[]>;
  addServer(params: AddServerParams): Promise<CoolifyServer>;
  getServer(uuid: string): Promise<CoolifyServer>;
  validateServer(uuid: string): Promise<{ is_reachable: boolean; is_usable: boolean }>;
  deleteServer(uuid: string): Promise<void>;
}
