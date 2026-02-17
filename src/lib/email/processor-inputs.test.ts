import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeAttachmentBase64,
  maxBase64LengthForBytes,
  parseProcessInboundQueryParams,
  resolveMaxAttachmentBytes,
  stripBase64Prefix,
  DEFAULT_MAX_ATTACHMENT_BYTES,
} from "./processor-inputs.ts";

test("parseProcessInboundQueryParams returns undefined values when params are absent", () => {
  const parsed = parseProcessInboundQueryParams(
    "https://example.com/api/admin/email/process-inbound"
  );

  assert.equal(parsed.batch_size, undefined);
  assert.equal(parsed.max_retries, undefined);
});

test("parseProcessInboundQueryParams parses numeric params", () => {
  const parsed = parseProcessInboundQueryParams(
    "https://example.com/api/admin/email/process-inbound?batch_size=15&max_retries=7"
  );

  assert.equal(parsed.batch_size, 15);
  assert.equal(parsed.max_retries, 7);
});

test("parseProcessInboundQueryParams ignores invalid numeric params", () => {
  const parsed = parseProcessInboundQueryParams(
    "https://example.com/api/admin/email/process-inbound?batch_size=abc&max_retries="
  );

  assert.equal(parsed.batch_size, undefined);
  assert.equal(parsed.max_retries, undefined);
});

test("resolveMaxAttachmentBytes uses default for invalid env values", () => {
  assert.equal(resolveMaxAttachmentBytes(undefined), DEFAULT_MAX_ATTACHMENT_BYTES);
  assert.equal(resolveMaxAttachmentBytes(""), DEFAULT_MAX_ATTACHMENT_BYTES);
  assert.equal(resolveMaxAttachmentBytes("not-a-number"), DEFAULT_MAX_ATTACHMENT_BYTES);
  assert.equal(resolveMaxAttachmentBytes("-1"), DEFAULT_MAX_ATTACHMENT_BYTES);
});

test("resolveMaxAttachmentBytes parses valid values and caps at hard limit", () => {
  assert.equal(resolveMaxAttachmentBytes("1048576"), 1048576);
  assert.equal(resolveMaxAttachmentBytes(String(200 * 1024 * 1024)), 100 * 1024 * 1024);
});

test("stripBase64Prefix removes data URL prefix and whitespace", () => {
  const stripped = stripBase64Prefix("data:text/plain;base64, SGV sbG8= \n");
  assert.equal(stripped, "SGVsbG8=");
});

test("decodeAttachmentBase64 decodes valid base64 payload", () => {
  const decoded = decodeAttachmentBase64("SGVsbG8=");
  assert.equal(decoded.toString("utf8"), "Hello");
});

test("decodeAttachmentBase64 rejects invalid base64 payload", () => {
  assert.throws(() => decodeAttachmentBase64("%%%not-base64%%%"), /not valid base64/);
});

test("decodeAttachmentBase64 rejects empty payload", () => {
  assert.throws(() => decodeAttachmentBase64(""), /content was empty/);
});

test("maxBase64LengthForBytes returns expected encoded length", () => {
  assert.equal(maxBase64LengthForBytes(3), 4);
  assert.equal(maxBase64LengthForBytes(4), 8);
  assert.equal(maxBase64LengthForBytes(10), 16);
});
