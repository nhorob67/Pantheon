export interface InstanceStatus {
  id: string;
  status:
    | "provisioning"
    | "provisioning_server"
    | "provisioning_coolify"
    | "running"
    | "stopped"
    | "error"
    | "deprovisioning"
    | "deprovisioned";
  uptime_seconds: number | null;
  last_health_check: string | null;
  messages_today: number;
  channel_type: string;
  openclaw_version: string | null;
  server_ip: string | null;
  hetzner_location: string | null;
}

export interface ProvisionRequest {
  customer_id: string;
  farm_profile: {
    farm_name: string;
    state: string;
    county: string;
    primary_crops: string[];
    acres: number;
    elevators: { name: string; url: string; crops: string[] }[];
    weather_location: string;
    weather_lat: number;
    weather_lng: number;
    timezone: string;
  };
  channel: {
    type: "discord";
    token: string;
  };
}

export interface ProvisionStep {
  label: string;
  status: "pending" | "active" | "complete" | "error";
}

export const PROVISION_STEPS: ProvisionStep[] = [
  { label: "Creating instance", status: "pending" },
  { label: "Installing skills", status: "pending" },
  { label: "Connecting channel", status: "pending" },
  { label: "Running health check", status: "pending" },
  { label: "Going live", status: "pending" },
];
