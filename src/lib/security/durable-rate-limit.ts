import { createAdminClient } from "@/lib/supabase/admin";

interface DurableRateLimitInput {
  action: string;
  key: string;
  windowSeconds: number;
  maxAttempts: number;
}

interface DurableUserRateLimitInput {
  action: string;
  userId: string;
  windowSeconds: number;
  maxAttempts: number;
}

export type DurableRateLimitStatus =
  | "allowed"
  | "blocked"
  | "unavailable";

/**
 * Consumes a single attempt from a durable, DB-backed rate limiter bucket.
 * Returns true when allowed, false when the bucket is exhausted.
 */
export async function consumeDurableRateLimit(
  input: DurableRateLimitInput
): Promise<boolean> {
  const action = input.action.trim().toLowerCase();
  const key = input.key.trim().toLowerCase();

  if (!action || !key) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit_token", {
    p_action: action,
    p_key: key,
    p_window_seconds: input.windowSeconds,
    p_max_attempts: input.maxAttempts,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

/**
 * Helper for per-user durable limits.
 * Returns a status enum instead of throwing to simplify route handling.
 */
export async function consumeDurableUserRateLimit(
  input: DurableUserRateLimitInput
): Promise<DurableRateLimitStatus> {
  try {
    const allowed = await consumeDurableRateLimit({
      action: input.action,
      key: input.userId,
      windowSeconds: input.windowSeconds,
      maxAttempts: input.maxAttempts,
    });

    return allowed ? "allowed" : "blocked";
  } catch {
    return "unavailable";
  }
}
