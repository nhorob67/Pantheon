import test from "node:test";
import assert from "node:assert/strict";
import {
  constantTimeTokenEquals,
  constantTimeTokenInSet,
} from "./constant-time.ts";

test("constantTimeTokenEquals returns true for exact token match", () => {
  assert.equal(constantTimeTokenEquals("token-123", "token-123"), true);
});

test("constantTimeTokenEquals trims surrounding whitespace", () => {
  assert.equal(constantTimeTokenEquals("  token-123  ", "token-123"), true);
});

test("constantTimeTokenEquals returns false for mismatch", () => {
  assert.equal(constantTimeTokenEquals("token-123", "token-xyz"), false);
});

test("constantTimeTokenInSet returns true when token is present", () => {
  assert.equal(
    constantTimeTokenInSet("cron-secret", ["processor-token", "cron-secret"]),
    true
  );
});

test("constantTimeTokenInSet returns false when token is missing", () => {
  assert.equal(
    constantTimeTokenInSet("nope", ["processor-token", "cron-secret"]),
    false
  );
});
