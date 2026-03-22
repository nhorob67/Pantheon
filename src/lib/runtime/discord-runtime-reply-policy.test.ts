import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTerminalSummary,
  classifyIntermediateText,
  getDiscordReplyOrchestratorMode,
  isStrongTerminalAnswer,
  isWeakProcessText,
  normalizeReplyContent,
  resolvePhaseKey,
  shouldEmitKeepalive,
  shouldSendVisibleMessage,
} from "./discord-runtime-reply-policy.ts";
import { buildDefaultDiscordReplyLifecycleMetadata } from "./discord-runtime-reply-types.ts";

test("normalizeReplyContent strips control tokens and applies response prefix", () => {
  const normalized = normalizeReplyContent({
    text: "NO_REPLY\n\nFound 128 visitors in the last 24 hours.",
    kind: "terminal_answer",
    responsePrefix: "[Pantheon]",
  });

  assert.equal(normalized.skip, false);
  assert.equal(normalized.text, "[Pantheon] Found 128 visitors in the last 24 hours.");
});

test("normalizeReplyContent skips heartbeat-only payloads", () => {
  const normalized = normalizeReplyContent({
    text: "HEARTBEAT_OK",
    kind: "keepalive",
  });

  assert.equal(normalized.skip, true);
  assert.equal(normalized.skipReason, "heartbeat");
});

test("classifyIntermediateText suppresses hedging and overlapping filler", () => {
  assert.deepEqual(
    classifyIntermediateText({
      text: "Let me check the API docs now.",
    }),
    { action: "suppress", reason: "hedging" }
  );

  assert.deepEqual(
    classifyIntermediateText({
      text: "The docs endpoint is still the same and I'm checking one more source now.",
      priorMilestones: ["The docs endpoint is still the same and I'm checking one more source now."],
    }),
    { action: "suppress", reason: "overlap" }
  );
});

test("classifyIntermediateText promotes substantive updates", () => {
  const result = classifyIntermediateText({
    text: "The Discourse docs show that /about.json returns active_users_last_day for the last 24 hours.",
  });

  assert.equal(result.action, "promote");
  assert.equal(result.reason, "substantive");
});

test("resolvePhaseKey maps custom tool sources safely", () => {
  assert.equal(resolvePhaseKey("integration_api_call"), "api_call");
  assert.equal(resolvePhaseKey("mcp.github.list_issues", "mcp"), "mcp_tool");
  assert.equal(resolvePhaseKey("skill_run", "skill"), "skill_execution");
  assert.equal(resolvePhaseKey("totally_unknown_tool"), "generic_tool");
});

test("isStrongTerminalAnswer rejects process text and accepts substantive answers", () => {
  assert.equal(isStrongTerminalAnswer("I'm checking that now."), false);
  assert.equal(
    isStrongTerminalAnswer("There were 128 visitors in the last 24 hours."),
    true
  );
});

test("buildTerminalSummary prefers explicit completion and failure summaries", () => {
  assert.equal(
    buildTerminalSummary({
      responseText: "There were 128 visitors in the last 24 hours.",
      status: "completed",
    }),
    "Task complete. There were 128 visitors in the last 24 hours."
  );

  assert.equal(
    buildTerminalSummary({
      errorMessage: "The Discourse API returned 403.",
      status: "failed",
    }),
    "Task failed. The Discourse API returned 403."
  );
});

test("getDiscordReplyOrchestratorMode is always active", () => {
  assert.equal(getDiscordReplyOrchestratorMode(), "active");
});

// --- Bug fix proof: blocked_on_approval suppression ---

test("shouldSendVisibleMessage blocks milestone during blocked_on_approval", () => {
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "blocked_on_approval" as const,
  };
  const result = shouldSendVisibleMessage({
    lifecycle,
    now: new Date(),
    sentKey: "phase:api_call",
    kind: "milestone",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "blocked_on_approval");
});

test("shouldSendVisibleMessage blocks keepalive during blocked_on_approval", () => {
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "blocked_on_approval" as const,
  };
  const result = shouldSendVisibleMessage({
    lifecycle,
    now: new Date(),
    sentKey: "keepalive:1",
    kind: "keepalive",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "blocked_on_approval");
});

test("shouldSendVisibleMessage allows terminal_failure during blocked_on_approval", () => {
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "blocked_on_approval" as const,
  };
  const result = shouldSendVisibleMessage({
    lifecycle,
    now: new Date(),
    sentKey: "terminal",
    kind: "terminal_failure",
  });
  assert.equal(result.allowed, true);
});

// --- resolvePhaseKey completeness ---

test("resolvePhaseKey maps memory_ prefix to memory_lookup", () => {
  assert.equal(resolvePhaseKey("memory_search"), "memory_lookup");
});

test("resolvePhaseKey maps conversation_ prefix to memory_lookup", () => {
  assert.equal(resolvePhaseKey("conversation_recall"), "memory_lookup");
});

test("resolvePhaseKey maps browser_ prefix to browser_check", () => {
  assert.equal(resolvePhaseKey("browser_navigate"), "browser_check");
});

test("resolvePhaseKey maps config_ and self_config_ prefix to config_update", () => {
  assert.equal(resolvePhaseKey("config_set"), "config_update");
  assert.equal(resolvePhaseKey("self_config_update"), "config_update");
});

// --- shouldEmitKeepalive edge cases ---

test("shouldEmitKeepalive returns false when silence is below threshold", () => {
  const now = new Date();
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "active" as const,
    last_visible_event_at: new Date(now.getTime() - 20_000).toISOString(),
  };
  assert.equal(shouldEmitKeepalive({ lifecycle, now }), false);
});

test("shouldEmitKeepalive returns true at exactly spacing threshold", () => {
  const now = new Date();
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "active" as const,
    last_visible_event_at: new Date(now.getTime() - 30_000).toISOString(),
  };
  assert.equal(shouldEmitKeepalive({ lifecycle, now }), true);
});

test("shouldEmitKeepalive returns false when keepalive_count is at max", () => {
  const now = new Date();
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "active" as const,
    keepalive_count: 3,
    last_visible_event_at: new Date(now.getTime() - 60_000).toISOString(),
  };
  assert.equal(shouldEmitKeepalive({ lifecycle, now }), false);
});

test("shouldEmitKeepalive returns false during blocked_on_approval", () => {
  const now = new Date();
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "blocked_on_approval" as const,
    last_visible_event_at: new Date(now.getTime() - 60_000).toISOString(),
  };
  assert.equal(shouldEmitKeepalive({ lifecycle, now }), false);
});

// --- normalizeReplyContent edge cases ---

test("normalizeReplyContent strips multiple control tokens mixed with real content", () => {
  const result = normalizeReplyContent({
    text: "NO_REPLY some real content HEARTBEAT_OK more content NO_REPLY",
    kind: "milestone",
  });
  assert.equal(result.skip, false);
  assert.equal(result.text, "some real content more content");
});

test("normalizeReplyContent returns skip when whitespace-only after stripping", () => {
  const result = normalizeReplyContent({
    text: "NO_REPLY   HEARTBEAT_OK",
    kind: "milestone",
  });
  assert.equal(result.skip, true);
  assert.equal(result.skipReason, "empty");
});

// --- isWeakProcessText ---

test("isWeakProcessText returns true for empty string", () => {
  assert.equal(isWeakProcessText(""), true);
});

test("isWeakProcessText returns true for done pattern and false for substantive text", () => {
  assert.equal(isWeakProcessText("Done! I checked that"), true);
  assert.equal(
    isWeakProcessText("There were 128 visitors in the last 24 hours according to the API."),
    false
  );
});

// --- buildTerminalSummary priority order ---

test("buildTerminalSummary uses responsePreview when responseText is weak", () => {
  const result = buildTerminalSummary({
    responseText: "Done! I checked that.",
    responsePreview: "Found 128 visitors in the last 24 hours.",
    status: "completed",
  });
  assert.equal(result, "Task complete. Found 128 visitors in the last 24 hours.");
});

test("buildTerminalSummary uses toolSummary when no text or preview", () => {
  const result = buildTerminalSummary({
    responseText: "",
    toolSummary: "integration_api_call:success",
    status: "completed",
  });
  assert.equal(result, "Task complete. integration_api_call:success");
});

test("buildTerminalSummary returns generic when all empty", () => {
  const result = buildTerminalSummary({
    responseText: "",
    status: "completed",
  });
  assert.equal(result, "Task complete.");
});
