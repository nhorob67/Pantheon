import assert from "node:assert/strict";
import test from "node:test";
import { executeRuntimeSafeTool } from "./tenant-runtime-safe-tools.ts";

test("uuid tool returns RFC4122-format identifier", async () => {
  const result = await executeRuntimeSafeTool("uuid", {});
  assert.match(
    String(result.output.uuid || ""),
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

test("base64 encode/decode roundtrip preserves utf8 value", async () => {
  const encoded = await executeRuntimeSafeTool("base64_encode", {
    value: "farmclaw:hello",
  });
  const decoded = await executeRuntimeSafeTool("base64_decode", {
    base64: String(encoded.output.base64 || ""),
  });
  assert.equal(decoded.output.value, "farmclaw:hello");
});

test("base64_decode rejects invalid payloads", async () => {
  await assert.rejects(
    () =>
      executeRuntimeSafeTool("base64_decode", {
        base64: "not-valid-base64!!!",
      }),
    /invalid base64 content/
  );
});
