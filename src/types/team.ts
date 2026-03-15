export const CHANNEL_TYPES = ["discord"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export interface TeamProfile {
  id: string;
  customer_id: string;
  team_name: string;
  description: string | null;
  industry: string | null;
  team_goal: string | null;
  timezone: string;
  discord_completion_notifications_enabled: boolean;
  location_label: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
}
