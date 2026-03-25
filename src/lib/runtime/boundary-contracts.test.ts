import assert from "node:assert/strict";
import test from "node:test";
import { chunkReplyContent } from "./discord-runtime-reply-policy";
import type { QueryLikeRecord } from "@/lib/ai/query-output-formatter";
import type { UnifiedInvocationRecord } from "./unified-tool-executor";

// ---------------------------------------------------------------------------
// chunkReplyContent contract: each chunk ≤ 2000 chars
// ---------------------------------------------------------------------------

test("chunkReplyContent produces chunks within Discord 2000-char limit", () => {
  const longText = "This is a line of text that should be chunked.\n".repeat(200);
  const chunks = chunkReplyContent(longText);
  for (const chunk of chunks) {
    assert.ok(
      chunk.length <= 2000,
      `Chunk length ${chunk.length} exceeds Discord 2000-char limit`
    );
  }
  assert.ok(chunks.length > 0, "Should produce at least one chunk");
});

test("chunkReplyContent preserves all content across chunks", () => {
  const text = "Line one\nLine two\nLine three\nLine four";
  const chunks = chunkReplyContent(text);
  const rejoined = chunks.join("");
  assert.ok(rejoined.includes("Line one"));
  assert.ok(rejoined.includes("Line four"));
});

test("chunkReplyContent handles empty input", () => {
  const chunks = chunkReplyContent("");
  assert.equal(chunks.length, 1);
});

// ---------------------------------------------------------------------------
// UnifiedInvocationRecord structurally satisfies QueryLikeRecord
// ---------------------------------------------------------------------------

test("UnifiedInvocationRecord is structurally compatible with QueryLikeRecord", () => {
  // This is a compile-time contract test. If UnifiedInvocationRecord ever
  // removes toolName or inputSummary, this test will fail to compile.
  const record: UnifiedInvocationRecord = {
    toolName: "memory_search",
    startedAt: Date.now(),
    durationMs: 100,
    success: true,
    errorClass: null,
    inputSummary: '{"query":"test"}',
    outputSummary: '{"results":[]}',
  };

  // Must satisfy QueryLikeRecord shape
  const queryRecord: QueryLikeRecord = record;
  assert.equal(queryRecord.toolName, "memory_search");
  assert.equal(queryRecord.inputSummary, '{"query":"test"}');
});

// ---------------------------------------------------------------------------
// Synthetic message IDs should never be valid Discord snowflakes
// ---------------------------------------------------------------------------

test("cron synthetic IDs are not valid Discord snowflakes", () => {
  // Cron runs use null message_id now. This test ensures the old synthetic
  // format would be correctly rejected by the snowflake regex.
  const syntheticId = `cron-abc123-${Date.now()}`;
  const isSnowflake = /^\d+$/.test(syntheticId);
  assert.equal(isSnowflake, false, "Synthetic cron IDs must NOT pass snowflake validation");
});

test("valid Discord snowflakes pass numeric check", () => {
  const snowflake = "1234567890123456789";
  assert.equal(/^\d+$/.test(snowflake), true);
});
