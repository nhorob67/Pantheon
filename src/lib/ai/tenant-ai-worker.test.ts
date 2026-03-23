import assert from "node:assert/strict";
import test from "node:test";
import {
  formatQueryToolOutput,
  isQueryLikeToolRecord,
  shouldScheduleStructuralFollowUp,
  shouldSuppressIntermediateToolPreamble,
} from "./tenant-ai-worker.ts";

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
  responseText: string,
  options?: {
    hasToolCallsAfterText?: boolean;
    recordCount?: number;
  }
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
      if (options?.hasToolCallsAfterText && (options.recordCount ?? 0) > 0) {
        responseText = "";
      } else {
        skipFinalSend = true;
      }
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

test("reconciliation clears the final text when tools completed after intermediate progress", () => {
  const result = reconcile(
    ["Let me try that one more time."],
    "Let me try that one more time.",
    {
      hasToolCallsAfterText: true,
      recordCount: 1,
    }
  );
  assert.equal(result.responseText, "");
  assert.equal(result.skipFinalSend, false);
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

test("suppresses low-value intermediate tool preambles", () => {
  assert.equal(
    shouldSuppressIntermediateToolPreamble("Let me check the visitor stats from your Discourse community:"),
    true
  );
  assert.equal(
    shouldSuppressIntermediateToolPreamble("There were 128 visitors in the last 24 hours."),
    false
  );
});

test("treats GET integration_api_call records as query-like", () => {
  assert.equal(
    isQueryLikeToolRecord({
      toolName: "integration_api_call",
      inputSummary: JSON.stringify({ method: "GET", path: "/admin/dashboard.json", integration_slug: "discourse" }),
    }),
    true
  );
  assert.equal(
    isQueryLikeToolRecord({
      toolName: "integration_api_call",
      inputSummary: JSON.stringify({ method: "POST", path: "/posts.json", integration_slug: "discourse" }),
    }),
    false
  );
});

test("formats discourse dashboard visitor counts from integration_api_call output", () => {
  const result = formatQueryToolOutput(
    "integration_api_call",
    JSON.stringify({
      status: 200,
      status_text: "OK",
      integration: "discourse",
      body: {
        reports: [
          {
            type: "visitors",
            data: [
              ["2026-03-20", 91],
              ["2026-03-21", 128],
            ],
          },
        ],
      },
    }),
    JSON.stringify({
      method: "GET",
      path: "/admin/dashboard.json",
      integration_slug: "discourse",
    })
  );

  assert.equal(result, "There were 128 visitors in the last 24 hours.");
});

test("formats generic integration_api_call success without robotic status wrapping", () => {
  const result = formatQueryToolOutput(
    "integration_api_call",
    JSON.stringify({
      status: 200,
      status_text: "OK",
      integration: "discourse",
      body: "{\"success\":true}",
    }),
    JSON.stringify({
      method: "GET",
      path: "/site.json",
      integration_slug: "discourse",
    })
  );

  assert.equal(result, "I checked Discourse and it responded normally.");
});

// ---------------------------------------------------------------------------
// Structural follow-up safety net
// ---------------------------------------------------------------------------

test("shouldScheduleStructuralFollowUp triggers when progress was sent without a final reply", () => {
  assert.equal(
    shouldScheduleStructuralFollowUp({
      hasExplicitFollowUp: false,
      hasApprovalRequired: false,
      progressUpdatesSentCount: 2,
      finalReplyWillBeSent: false,
      terminalState: "completed",
    }),
    true
  );
});

test("shouldScheduleStructuralFollowUp does not trigger when a final reply will be sent and state is completed", () => {
  assert.equal(
    shouldScheduleStructuralFollowUp({
      hasExplicitFollowUp: false,
      hasApprovalRequired: false,
      progressUpdatesSentCount: 2,
      finalReplyWillBeSent: true,
      terminalState: "completed",
    }),
    false
  );
});

test("shouldScheduleStructuralFollowUp does not trigger when approval is pending", () => {
  assert.equal(
    shouldScheduleStructuralFollowUp({
      hasExplicitFollowUp: false,
      hasApprovalRequired: true,
      progressUpdatesSentCount: 2,
      finalReplyWillBeSent: false,
      terminalState: "continuing",
    }),
    false
  );
});

test("shouldScheduleStructuralFollowUp does not trigger when explicit follow-up already exists", () => {
  assert.equal(
    shouldScheduleStructuralFollowUp({
      hasExplicitFollowUp: true,
      hasApprovalRequired: false,
      progressUpdatesSentCount: 2,
      finalReplyWillBeSent: false,
      terminalState: "continuing",
    }),
    false
  );
});

test("shouldScheduleStructuralFollowUp does not trigger without progress updates", () => {
  assert.equal(
    shouldScheduleStructuralFollowUp({
      hasExplicitFollowUp: false,
      hasApprovalRequired: false,
      progressUpdatesSentCount: 0,
      finalReplyWillBeSent: false,
      terminalState: "completed",
    }),
    false
  );
});

test("shouldScheduleStructuralFollowUp triggers when the structured state is continuing even if a final reply will be sent", () => {
  assert.equal(
    shouldScheduleStructuralFollowUp({
      hasExplicitFollowUp: false,
      hasApprovalRequired: false,
      progressUpdatesSentCount: 0,
      finalReplyWillBeSent: true,
      terminalState: "continuing",
    }),
    true
  );
});
