export const APP_NAME = "FarmClaw";
export const SUBSCRIPTION_PRICE = 50;
export const SUBSCRIPTION_PRICE_CENTS = 5000;
export const API_MARGIN = 0.25;
export const BASE_API_ALLOCATION_CENTS = 2500; // $25/month included
export const POLLING_INTERVAL = 30000; // 30 seconds
export const PROVISION_TIMEOUT = 60000; // 60 seconds

// Spending & cost dashboard
export const CONSULTANT_HOURLY_RATE_CENTS = 15000; // $150/hr
export const AVG_CONVERSATION_MINUTES = 15;
export const SPENDING_ANOMALY_MULTIPLIER = 3;
export const SPENDING_THRESHOLDS = [50, 80, 100] as const;
