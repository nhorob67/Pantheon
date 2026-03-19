import assert from "node:assert/strict";
import test from "node:test";

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
// Safety net promise detection pattern
// ---------------------------------------------------------------------------

const promisePattern =
  /\b(?:let me (?:try|check|set up|look into|work on|handle)|i['\u2019]ll (?:try|check|set up|look into|work on|handle|get|do|take care))/i;

test("promisePattern matches 'let me try'", () => {
  assert.ok(promisePattern.test("Sure, let me try that for you."));
});

test("promisePattern matches 'let me check'", () => {
  assert.ok(promisePattern.test("let me check on that"));
});

test("promisePattern matches 'let me set up'", () => {
  assert.ok(promisePattern.test("Let me set up the integration."));
});

test("promisePattern matches 'let me look into'", () => {
  assert.ok(promisePattern.test("Let me look into that issue."));
});

test("promisePattern matches 'let me work on'", () => {
  assert.ok(promisePattern.test("Let me work on the fix now."));
});

test("promisePattern matches 'let me handle'", () => {
  assert.ok(promisePattern.test("Let me handle this for you."));
});

test("promisePattern matches \"I'll try\"", () => {
  assert.ok(promisePattern.test("I'll try to fix that."));
});

test("promisePattern matches \"I'll check\"", () => {
  assert.ok(promisePattern.test("I'll check on the status."));
});

test("promisePattern matches \"I'll get\"", () => {
  assert.ok(promisePattern.test("I'll get that done right away."));
});

test("promisePattern matches \"I'll do\"", () => {
  assert.ok(promisePattern.test("I'll do it now."));
});

test("promisePattern matches \"I'll take care\"", () => {
  assert.ok(promisePattern.test("I'll take care of it."));
});

test("promisePattern matches with curly apostrophe", () => {
  assert.ok(promisePattern.test("I\u2019ll try to resolve this."));
});

test("promisePattern is case insensitive", () => {
  assert.ok(promisePattern.test("LET ME TRY THAT"));
  assert.ok(promisePattern.test("I'LL CHECK ON IT"));
});

test("promisePattern does not match unrelated text", () => {
  assert.ok(!promisePattern.test("Here is the result of your query."));
});

test("promisePattern does not match partial word boundaries", () => {
  // "allet me try" — "let me" is preceded by non-word-boundary "al"
  // but \b matches between 'l' and 'l' won't fire — actually "allet" has
  // no boundary before "let". Let's test a clearer case.
  assert.ok(!promisePattern.test("The wallet me try scenario"));
});

test("promisePattern does not match 'I will' without contraction", () => {
  assert.ok(!promisePattern.test("I will check on that."));
});
