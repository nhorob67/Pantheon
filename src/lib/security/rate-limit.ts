interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly name: string;

  constructor(name: string, options: RateLimiterOptions) {
    this.name = name;
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    // Periodic cleanup every 60s
    setInterval(() => this.cleanup(), 60_000).unref();
  }

  /**
   * Returns true if the request should be allowed, false if rate limited.
   */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      console.warn(
        `[RATE_LIMIT] ${this.name}: key=${key} exceeded ${this.maxRequests}/${this.windowMs}ms`
      );
      return false;
    }

    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export function createRateLimiter(
  name: string,
  options: RateLimiterOptions
): RateLimiter {
  return new RateLimiter(name, options);
}

/** Auth-related actions: 5 requests per 60 seconds */
export const authLimiter = createRateLimiter("auth", {
  windowMs: 60_000,
  maxRequests: 5,
});

/** Provisioning actions: 3 requests per 300 seconds */
export const provisionLimiter = createRateLimiter("provision", {
  windowMs: 300_000,
  maxRequests: 3,
});

/** Config/skill updates: 10 requests per 60 seconds */
export const configUpdateLimiter = createRateLimiter("config-update", {
  windowMs: 60_000,
  maxRequests: 10,
});

/** Agent CRUD: 10 requests per 60 seconds */
export const agentManagementLimiter = createRateLimiter("agent-management", {
  windowMs: 60_000,
  maxRequests: 10,
});

/** Instance lifecycle actions (restart/stop/deprovision): 5 requests per 60 seconds */
export const instanceActionLimiter = createRateLimiter("instance-action", {
  windowMs: 60_000,
  maxRequests: 5,
});

/** Composio integration actions: 5 requests per 60 seconds */
export const composioLimiter = createRateLimiter("composio", {
  windowMs: 60_000,
  maxRequests: 5,
});
