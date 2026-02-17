export type AlertType =
  | "spending_threshold"
  | "spending_anomaly"
  | "weather_severe"
  | "price_movement"
  | "ticket_anomaly";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertEvent {
  id: string;
  customer_id: string;
  alert_type: AlertType;
  alert_key: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledged_at: string | null;
  delivery_channels: string[];
  created_at: string;
}

export interface AlertPreferences {
  id: string;
  customer_id: string;
  spending_alerts_enabled: boolean;
  spending_alert_email: boolean;
  spending_alert_dashboard: boolean;
  weather_severe_enabled: boolean;
  weather_severe_discord: boolean;
  price_movement_enabled: boolean;
  price_movement_threshold_cents: number;
  price_movement_discord: boolean;
  ticket_anomaly_enabled: boolean;
  ticket_anomaly_discord: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpendingStatus {
  current_cents: number;
  cap_cents: number | null;
  percentage: number | null;
  daily_average_cents: number;
  days_elapsed: number;
  auto_pause: boolean;
}

export interface ConversationEvent {
  id: string;
  customer_id: string;
  instance_id: string;
  agent_key: string | null;
  date: string;
  message_count: number;
  user_message_count: number;
  assistant_message_count: number;
  conversation_count: number;
  created_at: string;
  updated_at: string;
}
