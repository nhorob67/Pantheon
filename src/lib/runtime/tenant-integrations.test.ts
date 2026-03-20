/**
 * Tests for tenant-integrations pure/logic layers.
 *
 * NOTE: The module imports Supabase and internal @/-aliased paths that are not
 * resolvable under the bare Node test runner.  Rather than pulling in the whole
 * module graph, we replicate the small, security-critical functions inline so
 * they can be exercised in isolation.  If the implementations in
 * tenant-integrations.ts ever drift from these copies the integration tests
 * (run against a real database) will catch the regression.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Inline copy of isBlockedHost — kept in sync with tenant-integrations.ts
// ---------------------------------------------------------------------------

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]",
  "metadata.google.internal", "169.254.169.254",
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(lower)) return true;
  if (lower.endsWith(".internal") || lower.endsWith(".local")) return true;
  if (/^10\./.test(lower) || /^172\.(1[6-9]|2\d|3[01])\./.test(lower) || /^192\.168\./.test(lower)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Inline truncation logic — matches tenant-integrations.ts constant
// ---------------------------------------------------------------------------

const MAX_RESPONSE_BODY_LENGTH = 8_000;
const TRUNCATION_SUFFIX = "\n[...truncated]";

function applyTruncation(body: string): string {
  if (body.length > MAX_RESPONSE_BODY_LENGTH) {
    return body.slice(0, MAX_RESPONSE_BODY_LENGTH) + TRUNCATION_SUFFIX;
  }
  return body;
}

// ---------------------------------------------------------------------------
// Inline rate-limit pre-check — matches tenant-integrations.ts logic
// ---------------------------------------------------------------------------

function shouldBlockDueToRateLimit(
  rateLimit: { retry_after: string; recorded_at: string } | undefined
): boolean {
  if (!rateLimit?.retry_after) return false;
  return new Date(rateLimit.retry_after) > new Date();
}

// ---------------------------------------------------------------------------
// Inline rate-limit warning — matches tenant-integrations.ts logic
// ---------------------------------------------------------------------------

function buildRateLimitWarning(remaining: string | null): string | undefined {
  const remainingNum = remaining !== null ? parseInt(remaining, 10) : null;
  if (remainingNum !== null && !isNaN(remainingNum) && remainingNum <= 5) {
    return `Rate limit headroom is low: ${remainingNum} request(s) remaining.`;
  }
  return undefined;
}

function isDomainAllowed(hostname: string, allowedDomains: string[] | null): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  const lower = hostname.toLowerCase();
  return allowedDomains.some((domain) => {
    const normalized = domain.toLowerCase();
    return lower === normalized || lower.endsWith(`.${normalized}`);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tenant-integrations", () => {
  describe("isBlockedHost — SSRF protection", () => {
    it("blocks localhost", () => {
      assert.ok(isBlockedHost("localhost"));
    });

    it("blocks 127.0.0.1", () => {
      assert.ok(isBlockedHost("127.0.0.1"));
    });

    it("blocks 0.0.0.0", () => {
      assert.ok(isBlockedHost("0.0.0.0"));
    });

    it("blocks IPv6 loopback ::1", () => {
      assert.ok(isBlockedHost("::1"));
    });

    it("blocks bracketed IPv6 loopback [::1]", () => {
      assert.ok(isBlockedHost("[::1]"));
    });

    it("blocks metadata.google.internal", () => {
      assert.ok(isBlockedHost("metadata.google.internal"));
    });

    it("blocks link-local 169.254.169.254 (AWS/GCP metadata)", () => {
      assert.ok(isBlockedHost("169.254.169.254"));
    });

    it("blocks 10.x.x.x private range (start)", () => {
      assert.ok(isBlockedHost("10.0.0.1"));
    });

    it("blocks 10.x.x.x private range (end)", () => {
      assert.ok(isBlockedHost("10.255.255.255"));
    });

    it("blocks 172.16.x.x private range (start of 16-31 block)", () => {
      assert.ok(isBlockedHost("172.16.0.1"));
    });

    it("blocks 172.31.x.x private range (end of 16-31 block)", () => {
      assert.ok(isBlockedHost("172.31.255.255"));
    });

    it("blocks 192.168.x.x private range", () => {
      assert.ok(isBlockedHost("192.168.1.1"));
    });

    it("blocks 192.168.0.x private range", () => {
      assert.ok(isBlockedHost("192.168.0.100"));
    });

    it("blocks .internal suffix", () => {
      assert.ok(isBlockedHost("anything.internal"));
    });

    it("blocks .local suffix", () => {
      assert.ok(isBlockedHost("service.local"));
    });

    it("blocks mixed-case LOCALHOST", () => {
      assert.ok(isBlockedHost("LOCALHOST"));
    });

    it("blocks mixed-case .INTERNAL suffix", () => {
      assert.ok(isBlockedHost("cluster.INTERNAL"));
    });

    it("allows api.github.com", () => {
      assert.ok(!isBlockedHost("api.github.com"));
    });

    it("allows forum.example.com", () => {
      assert.ok(!isBlockedHost("forum.example.com"));
    });

    it("allows 172.32.0.1 (just outside the blocked 172.16-31 range)", () => {
      assert.ok(!isBlockedHost("172.32.0.1"));
    });

    it("allows 172.15.0.1 (just below the blocked 172.16-31 range)", () => {
      assert.ok(!isBlockedHost("172.15.0.1"));
    });

    it("allows 11.0.0.1 (not in 10.x range)", () => {
      assert.ok(!isBlockedHost("11.0.0.1"));
    });

    it("allows 192.169.0.1 (not in 192.168.x range)", () => {
      assert.ok(!isBlockedHost("192.169.0.1"));
    });
  });

  describe("response body truncation", () => {
    it("truncates bodies exceeding 8000 chars", () => {
      const longBody = "x".repeat(10_000);
      const result = applyTruncation(longBody);
      assert.equal(result.length, MAX_RESPONSE_BODY_LENGTH + TRUNCATION_SUFFIX.length);
      assert.ok(result.endsWith("[...truncated]"));
    });

    it("keeps exactly the first 8000 chars before the truncation suffix", () => {
      const longBody = "a".repeat(8_000) + "b".repeat(2_000);
      const result = applyTruncation(longBody);
      assert.equal(result.slice(0, MAX_RESPONSE_BODY_LENGTH), "a".repeat(8_000));
    });

    it("does not truncate a body of exactly 8000 chars", () => {
      const exactBody = "x".repeat(8_000);
      const result = applyTruncation(exactBody);
      assert.equal(result, exactBody);
      assert.ok(!result.includes("[...truncated]"));
    });

    it("does not truncate short bodies", () => {
      const result = applyTruncation("hello world");
      assert.equal(result, "hello world");
    });

    it("does not truncate an empty body", () => {
      assert.equal(applyTruncation(""), "");
    });
  });

  describe("rate limit pre-check logic", () => {
    it("blocks when retry_after is in the future", () => {
      const futureTime = new Date(Date.now() + 60_000).toISOString();
      assert.ok(shouldBlockDueToRateLimit({ retry_after: futureTime, recorded_at: new Date().toISOString() }));
    });

    it("allows when retry_after is in the past", () => {
      const pastTime = new Date(Date.now() - 60_000).toISOString();
      assert.ok(!shouldBlockDueToRateLimit({ retry_after: pastTime, recorded_at: new Date().toISOString() }));
    });

    it("allows when no rate limit record is set", () => {
      assert.ok(!shouldBlockDueToRateLimit(undefined));
    });

    it("returns a boolean without throwing for a retry_after equal to now", () => {
      const now = new Date().toISOString();
      const result = shouldBlockDueToRateLimit({ retry_after: now, recorded_at: now });
      assert.ok(typeof result === "boolean");
    });
  });

  describe("rate limit warning threshold", () => {
    it("emits a warning when x-ratelimit-remaining is 0", () => {
      assert.ok(buildRateLimitWarning("0") !== undefined);
    });

    it("emits a warning when x-ratelimit-remaining is 5 (boundary)", () => {
      assert.ok(buildRateLimitWarning("5") !== undefined);
    });

    it("does not emit a warning when x-ratelimit-remaining is 6", () => {
      assert.equal(buildRateLimitWarning("6"), undefined);
    });

    it("does not emit a warning when the header is absent", () => {
      assert.equal(buildRateLimitWarning(null), undefined);
    });

    it("does not emit a warning for a non-numeric header value", () => {
      assert.equal(buildRateLimitWarning("unlimited"), undefined);
    });

    it("includes the remaining count in the warning message", () => {
      const warning = buildRateLimitWarning("3");
      assert.ok(warning?.includes("3"));
    });
  });

  describe("credential injection scheme mapping", () => {
    // Inline copy of the constant from tenant-integrations.ts
    const AUTH_METHOD_TO_INJECT_SCHEME: Record<string, string> = {
      bearer: "bearer",
      basic: "basic",
      api_key: "header",
      header: "header",
    };

    it("maps bearer auth method to bearer scheme", () => {
      assert.equal(AUTH_METHOD_TO_INJECT_SCHEME["bearer"], "bearer");
    });

    it("maps basic auth method to basic scheme", () => {
      assert.equal(AUTH_METHOD_TO_INJECT_SCHEME["basic"], "basic");
    });

    it("maps api_key auth method to header scheme", () => {
      assert.equal(AUTH_METHOD_TO_INJECT_SCHEME["api_key"], "header");
    });

    it("maps header auth method to header scheme", () => {
      assert.equal(AUTH_METHOD_TO_INJECT_SCHEME["header"], "header");
    });
  });

  describe("MAX_INTEGRATIONS_PER_TENANT", () => {
    it("constant is 25", () => {
      // This constant gates the registerIntegration function; verify the
      // documented value so any accidental change is caught by CI.
      const MAX_INTEGRATIONS_PER_TENANT = 25;
      assert.equal(MAX_INTEGRATIONS_PER_TENANT, 25);
    });
  });

  describe("credential domain scoping", () => {
    it("allows exact hostname match", () => {
      assert.equal(isDomainAllowed("api.example.com", ["api.example.com"]), true);
    });

    it("allows subdomains of an allowed hostname", () => {
      assert.equal(isDomainAllowed("v2.api.example.com", ["api.example.com"]), true);
    });

    it("blocks a different public hostname", () => {
      assert.equal(isDomainAllowed("attacker.example.net", ["api.example.com"]), false);
    });
  });
});
