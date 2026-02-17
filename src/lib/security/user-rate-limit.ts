import {
  consumeDurableUserRateLimit,
  type DurableRateLimitStatus,
} from "@/lib/security/durable-rate-limit";

export function consumeConfigUpdateRateLimit(
  userId: string
): Promise<DurableRateLimitStatus> {
  return consumeDurableUserRateLimit({
    action: "config_update_user",
    userId,
    windowSeconds: 60,
    maxAttempts: 10,
  });
}

export function consumeAgentManagementRateLimit(
  userId: string
): Promise<DurableRateLimitStatus> {
  return consumeDurableUserRateLimit({
    action: "agent_management_user",
    userId,
    windowSeconds: 60,
    maxAttempts: 10,
  });
}

export function consumeInstanceActionRateLimit(
  userId: string
): Promise<DurableRateLimitStatus> {
  return consumeDurableUserRateLimit({
    action: "instance_action_user",
    userId,
    windowSeconds: 60,
    maxAttempts: 5,
  });
}

export function consumeComposioRateLimit(
  userId: string
): Promise<DurableRateLimitStatus> {
  return consumeDurableUserRateLimit({
    action: "composio_user",
    userId,
    windowSeconds: 60,
    maxAttempts: 5,
  });
}
