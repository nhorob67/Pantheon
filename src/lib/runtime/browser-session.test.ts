import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBlockedHost, checkDomainPolicy, isAuthUrl, isSensitiveField } from "../security/network-guard.ts";

// ---------------------------------------------------------------------------
// Network Guard Tests (shared SSRF + domain policy)
// ---------------------------------------------------------------------------

describe("isBlockedHost", () => {
  it("blocks localhost variants", () => {
    assert.ok(isBlockedHost("localhost"));
    assert.ok(isBlockedHost("127.0.0.1"));
    assert.ok(isBlockedHost("0.0.0.0"));
    assert.ok(isBlockedHost("::1"));
    assert.ok(isBlockedHost("[::1]"));
  });

  it("blocks .internal and .local domains", () => {
    assert.ok(isBlockedHost("metadata.google.internal"));
    assert.ok(isBlockedHost("something.local"));
    assert.ok(isBlockedHost("foo.internal"));
  });

  it("blocks private IP ranges", () => {
    assert.ok(isBlockedHost("10.0.0.1"));
    assert.ok(isBlockedHost("172.16.0.1"));
    assert.ok(isBlockedHost("192.168.1.1"));
  });

  it("blocks metadata IP", () => {
    assert.ok(isBlockedHost("169.254.169.254"));
  });

  it("allows public hosts", () => {
    assert.ok(!isBlockedHost("example.com"));
    assert.ok(!isBlockedHost("google.com"));
    assert.ok(!isBlockedHost("8.8.8.8"));
  });
});

describe("checkDomainPolicy", () => {
  it("returns null when no policy is set", () => {
    assert.equal(checkDomainPolicy("example.com", [], []), null);
  });

  it("blocks domains in blocklist", () => {
    const result = checkDomainPolicy("evil.com", [], ["evil.com"]);
    assert.ok(result !== null);
    assert.ok(result.includes("blocked"));
  });

  it("blocks subdomains in blocklist", () => {
    const result = checkDomainPolicy("sub.evil.com", [], ["evil.com"]);
    assert.ok(result !== null);
  });

  it("allows domains in allowlist", () => {
    assert.equal(checkDomainPolicy("allowed.com", ["allowed.com"], []), null);
  });

  it("blocks domains not in allowlist when allowlist is set", () => {
    const result = checkDomainPolicy("other.com", ["allowed.com"], []);
    assert.ok(result !== null);
    assert.ok(result.includes("not in the allowed"));
  });

  it("allows subdomains of allowlist entries", () => {
    assert.equal(checkDomainPolicy("sub.allowed.com", ["allowed.com"], []), null);
  });

  it("blocklist takes precedence over allowlist", () => {
    const result = checkDomainPolicy("both.com", ["both.com"], ["both.com"]);
    assert.ok(result !== null);
    assert.ok(result.includes("blocked"));
  });
});

describe("isAuthUrl", () => {
  it("detects login URLs", () => {
    assert.ok(isAuthUrl("https://example.com/login"));
    assert.ok(isAuthUrl("https://example.com/signin"));
    assert.ok(isAuthUrl("https://example.com/sign-in"));
    assert.ok(isAuthUrl("https://example.com/auth/callback"));
  });

  it("detects OAuth URLs", () => {
    assert.ok(isAuthUrl("https://accounts.google.com/"));
    assert.ok(isAuthUrl("https://login.microsoftonline.com/"));
  });

  it("passes non-auth URLs", () => {
    assert.ok(!isAuthUrl("https://example.com/dashboard"));
    assert.ok(!isAuthUrl("https://example.com/products"));
  });
});

describe("isSensitiveField", () => {
  it("detects password fields", () => {
    assert.ok(isSensitiveField("password"));
    assert.ok(isSensitiveField("Enter your Password"));
  });

  it("detects payment fields", () => {
    assert.ok(isSensitiveField("credit card number"));
    assert.ok(isSensitiveField("CVV"));
    assert.ok(isSensitiveField("Card Number"));
  });

  it("detects SSN fields", () => {
    assert.ok(isSensitiveField("Social Security Number"));
    assert.ok(isSensitiveField("SSN"));
  });

  it("passes non-sensitive fields", () => {
    assert.ok(!isSensitiveField("Email address"));
    assert.ok(!isSensitiveField("Company name"));
    assert.ok(!isSensitiveField("Search"));
  });
});
