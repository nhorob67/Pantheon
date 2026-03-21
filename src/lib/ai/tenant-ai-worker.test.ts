import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyUserVisibleReply,
  isPromiseLikeUserVisibleReply,
  shouldAutoScheduleFollowUp,
} from "./progress-replies.ts";

// ---------------------------------------------------------------------------
// buildFollowUpPrompt — not exported, so we replicate its logic here and test
// the same algorithm in isolation.
// ---------------------------------------------------------------------------

function buildFollowUpPrompt(payload: Record<string, unknown>): string {
  const taskSummary =
    typeof payload.task_summary === "string"
      ? payload.task_summary
      : "a previous task";
  const reason =
    typeof payload.reason === "string" ? payload.reason : "";
  const parts = [
    `You scheduled this follow-up while working on: ${taskSummary}`,
  ];
  if (reason) parts.push(`You wanted to check back because: ${reason}`);
  parts.push(
    "Pick up where you left off naturally. Lead with your finding or update — don't announce this is a follow-up. " +
      "If the task is done, share the result. If it needs more time, explain and optionally schedule another follow-up."
  );
  return parts.join("\n\n");
}

test("buildFollowUpPrompt includes task_summary when provided", () => {
  const result = buildFollowUpPrompt({ task_summary: "deploy the bot" });
  assert.ok(result.includes("deploy the bot"));
  assert.ok(result.includes("You scheduled this follow-up while working on:"));
});

test("buildFollowUpPrompt falls back to generic summary when task_summary is missing", () => {
  const result = buildFollowUpPrompt({});
  assert.ok(result.includes("a previous task"));
});

test("buildFollowUpPrompt falls back when task_summary is not a string", () => {
  const result = buildFollowUpPrompt({ task_summary: 42 });
  assert.ok(result.includes("a previous task"));
});

test("buildFollowUpPrompt includes reason when provided", () => {
  const result = buildFollowUpPrompt({
    task_summary: "check DNS",
    reason: "waiting for propagation",
  });
  assert.ok(result.includes("You wanted to check back because: waiting for propagation"));
});

test("buildFollowUpPrompt omits reason block when reason is empty string", () => {
  const result = buildFollowUpPrompt({
    task_summary: "check DNS",
    reason: "",
  });
  assert.ok(!result.includes("You wanted to check back because:"));
});

test("buildFollowUpPrompt omits reason block when reason is missing", () => {
  const result = buildFollowUpPrompt({ task_summary: "check DNS" });
  assert.ok(!result.includes("You wanted to check back because:"));
});

test("buildFollowUpPrompt always ends with the pickup instruction", () => {
  const result = buildFollowUpPrompt({});
  assert.ok(result.includes("Pick up where you left off naturally"));
});

// ---------------------------------------------------------------------------
// Intermediate/final reconciliation logic — replicated from tenant-ai-worker
// ---------------------------------------------------------------------------

function reconcile(
  deliveredIntermediateChunks: string[],
  responseText: string
): { responseText: string; skipFinalSend: boolean } {
  let skipFinalSend = false;
  if (deliveredIntermediateChunks.length > 0 && responseText) {
    let stripped = responseText;
    for (const delivered of deliveredIntermediateChunks) {
      if (stripped.startsWith(delivered)) {
        stripped = stripped.slice(delivered.length).trim();
      }
    }
    if (stripped.length > 0) {
      responseText = stripped;
    } else {
      skipFinalSend = true;
    }
  }
  return { responseText, skipFinalSend };
}

test("reconciliation strips a single intermediate chunk from the response", () => {
  const result = reconcile(["Hello, "], "Hello, how are you?");
  assert.equal(result.responseText, "how are you?");
  assert.equal(result.skipFinalSend, false);
});

test("reconciliation strips multiple intermediate chunks in order", () => {
  const result = reconcile(
    ["Part one. ", "Part two. "],
    "Part one. Part two. Part three."
  );
  assert.equal(result.responseText, "Part three.");
  assert.equal(result.skipFinalSend, false);
});

test("reconciliation sets skipFinalSend when entire response was delivered", () => {
  const result = reconcile(["Full response"], "Full response");
  assert.equal(result.skipFinalSend, true);
});

test("reconciliation sets skipFinalSend when chunks cover response with trailing whitespace", () => {
  const result = reconcile(["Full response"], "Full response   ");
  assert.equal(result.skipFinalSend, true);
});

test("reconciliation does nothing when there are no intermediate chunks", () => {
  const result = reconcile([], "Hello, world!");
  assert.equal(result.responseText, "Hello, world!");
  assert.equal(result.skipFinalSend, false);
});

test("reconciliation does nothing when responseText is empty", () => {
  const result = reconcile(["chunk"], "");
  assert.equal(result.responseText, "");
  assert.equal(result.skipFinalSend, false);
});

test("reconciliation skips a chunk that does not match the start of the remaining text", () => {
  const result = reconcile(["Mismatch"], "Hello, world!");
  assert.equal(result.responseText, "Hello, world!");
  assert.equal(result.skipFinalSend, false);
});

test("reconciliation only strips prefix matches, not arbitrary substrings", () => {
  const result = reconcile(["world"], "Hello, world!");
  // "world" does not start the responseText, so nothing is stripped
  assert.equal(result.responseText, "Hello, world!");
  assert.equal(result.skipFinalSend, false);
});

// ---------------------------------------------------------------------------
// Progress reply classification and follow-up safety net
// ---------------------------------------------------------------------------

test("isPromiseLikeUserVisibleReply matches 'let me try'", () => {
  assert.ok(isPromiseLikeUserVisibleReply("Sure, let me try that for you."));
});

test("isPromiseLikeUserVisibleReply matches 'let me check'", () => {
  assert.ok(isPromiseLikeUserVisibleReply("let me check on that"));
});

test("isPromiseLikeUserVisibleReply matches 'let me set up'", () => {
  assert.ok(isPromiseLikeUserVisibleReply("Let me set up the integration."));
});

test("isPromiseLikeUserVisibleReply matches 'let me look into'", () => {
  assert.ok(isPromiseLikeUserVisibleReply("Let me look into that issue."));
});

test("isPromiseLikeUserVisibleReply matches 'let me work on'", () => {
  assert.ok(isPromiseLikeUserVisibleReply("Let me work on the fix now."));
});

test("isPromiseLikeUserVisibleReply matches 'let me handle'", () => {
  assert.ok(isPromiseLikeUserVisibleReply("Let me handle this for you."));
});

test("isPromiseLikeUserVisibleReply matches \"I'll try\"", () => {
  assert.ok(isPromiseLikeUserVisibleReply("I'll try to fix that."));
});

test("isPromiseLikeUserVisibleReply matches \"I'll check\"", () => {
  assert.ok(isPromiseLikeUserVisibleReply("I'll check on the status."));
});

test("isPromiseLikeUserVisibleReply matches \"I'll get\"", () => {
  assert.ok(isPromiseLikeUserVisibleReply("I'll get that done right away."));
});

test("isPromiseLikeUserVisibleReply matches \"I'll do\"", () => {
  assert.ok(isPromiseLikeUserVisibleReply("I'll do it now."));
});

test("isPromiseLikeUserVisibleReply matches \"I'll take care\"", () => {
  assert.ok(isPromiseLikeUserVisibleReply("I'll take care of it."));
});

test("isPromiseLikeUserVisibleReply matches 'keep you posted'", () => {
  assert.ok(isPromiseLikeUserVisibleReply("I'll keep you posted here."));
});

test("isPromiseLikeUserVisibleReply matches generic long-task heartbeat wording", () => {
  assert.ok(isPromiseLikeUserVisibleReply("On it - I'm working through that now."));
});

test("isPromiseLikeUserVisibleReply matches with curly apostrophe", () => {
  assert.ok(isPromiseLikeUserVisibleReply("I\u2019ll try to resolve this."));
});

test("isPromiseLikeUserVisibleReply is case insensitive", () => {
  assert.ok(isPromiseLikeUserVisibleReply("LET ME TRY THAT"));
  assert.ok(isPromiseLikeUserVisibleReply("I'LL CHECK ON IT"));
});

test("isPromiseLikeUserVisibleReply does not match unrelated text", () => {
  assert.ok(!isPromiseLikeUserVisibleReply("Here is the result of your query."));
});

test("isPromiseLikeUserVisibleReply does not match partial word boundaries", () => {
  assert.ok(!isPromiseLikeUserVisibleReply("The wallet me try scenario"));
});

test("isPromiseLikeUserVisibleReply does not match 'I will' without contraction", () => {
  assert.ok(!isPromiseLikeUserVisibleReply("I will check on that."));
});

test("classifyUserVisibleReply marks promise-like progress as promise", () => {
  assert.equal(
    classifyUserVisibleReply("Let me try a different approach.", "progress"),
    "promise"
  );
});

test("classifyUserVisibleReply marks non-promise progress as progress", () => {
  assert.equal(
    classifyUserVisibleReply("I checked the docs and found the auth requirement.", "progress"),
    "progress"
  );
});

test("classifyUserVisibleReply marks final substantive replies as result", () => {
  assert.equal(
    classifyUserVisibleReply("The integration is now configured correctly.", "final"),
    "result"
  );
});

test("shouldAutoScheduleFollowUp triggers on final promise replies", () => {
  assert.equal(
    shouldAutoScheduleFollowUp({
      finalReplyKind: "promise",
      hasExplicitFollowUp: false,
      allToolsFailed: false,
      intermediatePromiseSent: false,
      intermediateInformationalTextSent: true,
      statusOnlyProgressSent: false,
      skipFinalSend: false,
    }),
    true
  );
});

test("shouldAutoScheduleFollowUp triggers when an intermediate promise was sent without a final result", () => {
  assert.equal(
    shouldAutoScheduleFollowUp({
      finalReplyKind: "none",
      hasExplicitFollowUp: false,
      allToolsFailed: false,
      intermediatePromiseSent: true,
      intermediateInformationalTextSent: false,
      statusOnlyProgressSent: true,
      skipFinalSend: true,
    }),
    true
  );
});

test("shouldAutoScheduleFollowUp triggers after status-only progress with no visible result", () => {
  assert.equal(
    shouldAutoScheduleFollowUp({
      finalReplyKind: "none",
      hasExplicitFollowUp: false,
      allToolsFailed: false,
      intermediatePromiseSent: false,
      intermediateInformationalTextSent: false,
      statusOnlyProgressSent: true,
      skipFinalSend: true,
    }),
    true
  );
});

test("shouldAutoScheduleFollowUp does not trigger when a real final result was sent", () => {
  assert.equal(
    shouldAutoScheduleFollowUp({
      finalReplyKind: "result",
      hasExplicitFollowUp: false,
      allToolsFailed: false,
      intermediatePromiseSent: true,
      intermediateInformationalTextSent: true,
      statusOnlyProgressSent: true,
      skipFinalSend: false,
    }),
    false
  );
});
