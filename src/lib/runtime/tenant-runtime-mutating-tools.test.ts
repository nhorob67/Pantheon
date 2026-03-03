import assert from "node:assert/strict";
import test from "node:test";
import {
  isMutatingRuntimeTool,
  normalizeTenantMemoryWriteToolArgs,
} from "./tenant-runtime-mutating-tools.ts";

test("tenant_memory_write args normalize defaults for tier/type/confidence", () => {
  const normalized = normalizeTenantMemoryWriteToolArgs({
    content_text: "Remember: apply fungicide after rain window.",
  });

  assert.equal(normalized.content_text, "Remember: apply fungicide after rain window.");
  assert.equal(normalized.memory_tier, "episodic");
  assert.equal(normalized.memory_type, "fact");
  assert.equal(normalized.confidence, 0.8);
  assert.deepEqual(normalized.content_json, {});
});

test("tenant_memory_write rejects invalid confidence and UUID arguments", () => {
  assert.throws(
    () =>
      normalizeTenantMemoryWriteToolArgs({
        content_text: "x",
        confidence: 1.2,
      }),
    /confidence must be between 0 and 1/
  );

  assert.throws(
    () =>
      normalizeTenantMemoryWriteToolArgs({
        content_text: "x",
        session_id: "not-a-uuid",
      }),
    /session_id must be a valid UUID/
  );
});

test("mutating tool key registry identifies supported mutating tools", () => {
  assert.equal(isMutatingRuntimeTool("tenant_memory_write"), true);
  assert.equal(isMutatingRuntimeTool("echo"), false);
});

