interface CircuitBreakerState {
  consecutiveFailures: number;
  openUntilMs: number | null;
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  now?: () => number;
}

const circuitStates = new Map<string, CircuitBreakerState>();
const MAX_CIRCUIT_STATES = 500;

// Periodic cleanup: remove idle entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of circuitStates) {
    if (state.consecutiveFailures === 0 && (state.openUntilMs === null || state.openUntilMs < now)) {
      circuitStates.delete(key);
    }
  }
}, 60_000).unref();

export class CircuitBreakerOpenError extends Error {
  readonly key: string;
  readonly retryAfterMs: number;

  constructor(key: string, retryAfterMs: number) {
    super(`Circuit breaker is open for '${key}'`);
    this.key = key;
    this.retryAfterMs = retryAfterMs;
  }
}

function getState(key: string): CircuitBreakerState {
  const existing = circuitStates.get(key);
  if (existing) {
    return existing;
  }

  // Evict oldest entry if at capacity
  if (circuitStates.size >= MAX_CIRCUIT_STATES) {
    const firstKey = circuitStates.keys().next().value;
    if (firstKey !== undefined) circuitStates.delete(firstKey);
  }

  const created: CircuitBreakerState = {
    consecutiveFailures: 0,
    openUntilMs: null,
  };
  circuitStates.set(key, created);
  return created;
}

export function resetCircuitBreakerState(key: string): void {
  circuitStates.delete(key);
}

export async function runWithCircuitBreaker<T>(
  key: string,
  action: () => Promise<T>,
  options: CircuitBreakerOptions
): Promise<T> {
  const now = options.now || Date.now;
  const state = getState(key);
  const currentMs = now();

  if (state.openUntilMs !== null && currentMs < state.openUntilMs) {
    throw new CircuitBreakerOpenError(key, state.openUntilMs - currentMs);
  }

  if (state.openUntilMs !== null && currentMs >= state.openUntilMs) {
    state.openUntilMs = null;
  }

  try {
    const result = await action();
    state.consecutiveFailures = 0;
    return result;
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      throw error;
    }

    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= options.failureThreshold) {
      state.openUntilMs = currentMs + options.cooldownMs;
      state.consecutiveFailures = 0;
    }

    throw error;
  }
}
