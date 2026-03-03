import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validateSameOriginUrl } from "./validate-redirect.ts";

describe("validateSameOriginUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it("accepts same-origin URL", () => {
    assert.equal(
      validateSameOriginUrl(
        "https://farmclaw.com/api/callback",
        "https://farmclaw.com/api/connect"
      ),
      true
    );
  });

  it("rejects different-origin URL", () => {
    assert.equal(
      validateSameOriginUrl(
        "https://evil.com/steal",
        "https://farmclaw.com/api/connect"
      ),
      false
    );
  });

  it("accepts NEXT_PUBLIC_APP_URL origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://farmclaw.com";
    assert.equal(
      validateSameOriginUrl(
        "https://farmclaw.com/api/callback",
        "https://localhost:3000/api/connect"
      ),
      true
    );
  });

  it("rejects invalid target URL", () => {
    assert.equal(
      validateSameOriginUrl("not-a-url", "https://farmclaw.com/api/connect"),
      false
    );
  });

  it("rejects javascript: protocol", () => {
    assert.equal(
      validateSameOriginUrl(
        "javascript:alert(1)",
        "https://farmclaw.com/api/connect"
      ),
      false
    );
  });

  it("rejects data: protocol", () => {
    assert.equal(
      validateSameOriginUrl(
        "data:text/html,<h1>hi</h1>",
        "https://farmclaw.com/api/connect"
      ),
      false
    );
  });

  it("rejects localhost/internal URLs", () => {
    assert.equal(
      validateSameOriginUrl(
        "http://127.0.0.1:8080/callback",
        "https://farmclaw.com/api/connect"
      ),
      false
    );
  });
});
