import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import type { FileCreateResult } from "@/lib/ai/tools/file-create";
import {
  dispatchDiscordRuntimeTerminalSuccess,
  dispatchDiscordRuntimeTerminalFailure,
  DiscordRuntimeReplyOrchestrator,
  emitDiscordRuntimeTerminalFailure,
} from "./discord-runtime-reply-orchestrator.ts";
import { buildDefaultDiscordReplyLifecycleMetadata } from "./discord-runtime-reply-types.ts";

function buildRun(
  overrides: Partial<TenantRuntimeRun> = {}
): TenantRuntimeRun {
  return {
    id: "run-1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    run_kind: "discord_runtime",
    source: "discord_ingress",
    status: "running",
    attempt_count: 1,
    max_attempts: 3,
    idempotency_key: "key-1",
    request_trace_id: "trace-1",
    correlation_id: "key-1",
    payload: {
      channel_id: "channel-1",
      message_id: "message-1",
    },
    result: {},
    error_message: null,
    queued_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: null,
    canceled_at: null,
    lock_expires_at: null,
    worker_id: "worker-1",
    metadata: {},
    parent_run_id: null,
    delegation_depth: 0,
    deadline_at: null,
    delegation_kind: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

test("active orchestrator sends milestones and terminal answers with files", async () => {
  const sends: Array<{ kind: string; content: string; fileCount?: number }> = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-1",
    replyToMessageId: "message-1",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        sends.push({ kind: "message", content });
        return { messageId: `msg-${sends.length}`, status: 200 };
      },
      sendMessageSequence: async ({ contents }) => {
        sends.push({ kind: "sequence", content: contents.join("\n\n") });
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
      sendMessageWithFiles: async ({ content, files }) => {
        sends.push({ kind: "files", content, fileCount: files.length });
        return { messageId: "msg-files", status: 200 };
      },
    },
  });

  const milestoneSent = await orchestrator.emitToolPhase({
    phaseKey: "integration_api_call",
  });
  assert.equal(milestoneSent, true);
  assert.equal(sends[0]?.content, "I'm making that API call now.");

  const pendingFiles: FileCreateResult[] = [
    {
      fileName: "report.csv",
      fileType: "csv",
      contentType: "text/csv",
      data: Buffer.from("col\n1\n", "utf-8"),
      sizeBytes: 6,
    },
  ];

  const result = await orchestrator.finalizeSuccess({
    responseText: "There were 128 visitors in the last 24 hours.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "integration_api_call:success",
    progressUpdatesSentCount: 1,
    pendingFiles,
  });

  assert.equal(result.finalReplySent, true);
  assert.equal(result.terminalKind, "answer");
  assert.equal(sends[1]?.kind, "files");
  assert.equal(sends[1]?.content, "There were 128 visitors in the last 24 hours.");
  assert.equal(sends[1]?.fileCount, 1);
  assert.equal(orchestrator.isTypingSealed(), true);
  assert.equal(
    persistedRun.metadata.reply_lifecycle &&
      typeof persistedRun.metadata.reply_lifecycle === "object" &&
      (persistedRun.metadata.reply_lifecycle as { terminal_kind?: string }).terminal_kind,
    "answer"
  );
});

test("active orchestrator falls back to text-only terminal delivery when attachment upload fails", async () => {
  const sends: Array<{ kind: string; content: string; fileCount?: number }> = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-1",
    replyToMessageId: "message-1",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedRun;
    },
    transport: {
      sendMessageSequence: async ({ contents }) => {
        sends.push({ kind: "sequence", content: contents.join("\n\n") });
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
      sendMessageWithFiles: async ({ content, files }) => {
        sends.push({ kind: "files_attempt", content, fileCount: files.length });
        throw new Error("upload failed");
      },
    },
  });

  const pendingFiles: FileCreateResult[] = [
    {
      fileName: "report.csv",
      fileType: "csv",
      contentType: "text/csv",
      data: Buffer.from("col\n1\n", "utf-8"),
      sizeBytes: 6,
    },
  ];

  const result = await orchestrator.finalizeSuccess({
    responseText: "There were 128 visitors in the last 24 hours.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "integration_api_call:success",
    progressUpdatesSentCount: 0,
    pendingFiles,
  });

  assert.equal(result.finalReplySent, true);
  assert.deepEqual(sends, [
    {
      kind: "files_attempt",
      content: "There were 128 visitors in the last 24 hours.",
      fileCount: 1,
    },
    {
      kind: "sequence",
      content: "There were 128 visitors in the last 24 hours.",
    },
  ]);
  assert.match(
    String(
      persistedRun.metadata.reply_lifecycle &&
        typeof persistedRun.metadata.reply_lifecycle === "object" &&
        (persistedRun.metadata.reply_lifecycle as { last_attachment_error?: string })
          .last_attachment_error
    ),
    /Failed to send terminal reply with attachments/
  );
  assert.ok(
    typeof (
      persistedRun.metadata.reply_lifecycle &&
      typeof persistedRun.metadata.reply_lifecycle === "object" &&
      (persistedRun.metadata.reply_lifecycle as {
        last_attachment_fallback_at?: string;
      }).last_attachment_fallback_at
    ) === "string"
  );
});

test("orchestrator mode is always active", () => {
  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: buildRun(),
    botToken: "token",
    channelId: "channel-1",
  });

  assert.equal(orchestrator.getMode(), "active");
  assert.equal(orchestrator.isEnabled(), true);
  assert.equal(orchestrator.isActive(), true);
});

test("approval lifecycle sends blocked then resumed messages once", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-1",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        sends.push(content);
        return { messageId: `msg-${sends.length}`, status: 200 };
      },
    },
  });

  const blockedSent = await orchestrator.emitApprovalRequested({
    approvalId: "approval-1",
    requiredRole: "owner",
  });
  const duplicateBlocked = await orchestrator.emitApprovalRequested({
    approvalId: "approval-1",
    requiredRole: "owner",
  });
  const resumedSent = await orchestrator.emitApprovalGranted({
    approvalId: "approval-1",
  });

  assert.equal(blockedSent, true);
  assert.equal(duplicateBlocked, false);
  assert.equal(resumedSent, true);
  assert.deepEqual(sends, [
    "I need owner approval before I can make that change. Once it's approved, I'll pick it up here.",
    "Approval came through. I'm picking it back up now.",
  ]);
});

test("file-ready lifecycle tracks pending files and emits once per file", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-1",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        sends.push(content);
        return { messageId: `msg-${sends.length}`, status: 200 };
      },
    },
  });

  const first = await orchestrator.emitFileReady({ filename: "report.csv" });
  const duplicate = await orchestrator.emitFileReady({ filename: "report.csv" });

  assert.equal(first, true);
  assert.equal(duplicate, false);
  assert.deepEqual(sends, ["I've got report.csv ready. I'll attach it with the result."]);
  assert.deepEqual(
    persistedRun.metadata.reply_lifecycle &&
      typeof persistedRun.metadata.reply_lifecycle === "object" &&
      (persistedRun.metadata.reply_lifecycle as { pending_file_names?: string[] }).pending_file_names,
    ["report.csv"]
  );
});

test("active orchestrator owns typing until terminal seal", async () => {
  let typingCalls = 0;
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-typing",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedRun;
    },
    transport: {
      sendTypingIndicator: async () => {
        typingCalls += 1;
      },
      sendMessageSequence: async ({ contents }) => {
        return { messageIds: contents.map((_, index) => `msg-${index + 1}`), status: 200, partsSent: contents.length };
      },
    },
  });

  assert.equal(await orchestrator.refreshTyping(), true);
  assert.equal(await orchestrator.refreshTyping(), false);

  await orchestrator.finalizeSuccess({
    responseText: "There were 128 visitors in the last 24 hours.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "integration_api_call:success",
    progressUpdatesSentCount: 0,
  });

  assert.equal(orchestrator.isTypingSealed(), true);
  assert.equal(await orchestrator.refreshTyping(), false);
  assert.equal(typingCalls, 1);
});

test("channel visibility arbitration prefers direct runs over follow-ups", async () => {
  const directMessages: string[] = [];
  const followUpMessages: string[] = [];
  let followUpTypingCalls = 0;
  let persistedFollowUpRun = buildRun({
    id: "run-follow-up",
    payload: {
      channel_id: "channel-shared",
      message_id: "message-1",
      run_kind: "discord_follow_up",
    },
  });
  let persistedDirectRun = buildRun({
    id: "run-direct",
    payload: {
      channel_id: "channel-shared",
      message_id: "message-2",
    },
  });

  const followUp = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedFollowUpRun,
    botToken: "token",
    channelId: "channel-shared",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedFollowUpRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedFollowUpRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        followUpMessages.push(content);
        return { messageId: `follow-up-${followUpMessages.length}`, status: 200 };
      },
      sendTypingIndicator: async () => {
        followUpTypingCalls += 1;
      },
    },
  });

  const direct = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedDirectRun,
    botToken: "token",
    channelId: "channel-shared",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedDirectRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedDirectRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        directMessages.push(content);
        return { messageId: `direct-${directMessages.length}`, status: 200 };
      },
    },
  });

  assert.equal(await followUp.emitToolPhase({ phaseKey: "web_search" }), true);
  assert.equal(await direct.emitToolPhase({ phaseKey: "integration_api_call" }), true);
  assert.equal(await followUp.refreshTyping(), false);
  assert.deepEqual(followUpMessages, ["I'm checking a couple of sources so I can answer this cleanly."]);
  assert.deepEqual(directMessages, ["I'm making that API call now."]);
  assert.equal(followUpTypingCalls, 0);
});

test("approval-blocked replies release channel ownership for the next run", async () => {
  const directMessages: string[] = [];
  const followUpMessages: string[] = [];

  let persistedDirectRun = buildRun({
    id: "run-direct-blocked",
    payload: {
      channel_id: "channel-blocked-shared",
      message_id: "message-1",
    },
  });
  let persistedFollowUpRun = buildRun({
    id: "run-follow-up-resume",
    payload: {
      channel_id: "channel-blocked-shared",
      message_id: "message-2",
      run_kind: "discord_follow_up",
    },
  });

  const direct = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedDirectRun,
    botToken: "token",
    channelId: "channel-blocked-shared",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedDirectRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedDirectRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        directMessages.push(content);
        return { messageId: `direct-${directMessages.length}`, status: 200 };
      },
    },
  });

  const followUp = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedFollowUpRun,
    botToken: "token",
    channelId: "channel-blocked-shared",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedFollowUpRun = {
        ...run,
        metadata: {
          ...run.metadata,
          ...patch,
        },
      };
      return persistedFollowUpRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        followUpMessages.push(content);
        return { messageId: `follow-up-${followUpMessages.length}`, status: 200 };
      },
    },
  });

  assert.equal(await direct.emitToolPhase({ phaseKey: "integration_api_call" }), true);
  assert.equal(await followUp.emitToolPhase({ phaseKey: "web_search" }), false);
  assert.equal(
    await direct.emitApprovalRequested({ approvalId: "approval-1", requiredRole: "owner" }),
    true
  );
  assert.equal(await followUp.emitToolPhase({ phaseKey: "web_search" }), true);

  assert.deepEqual(directMessages, [
    "I'm making that API call now.",
    "I need owner approval before I can make that change. Once it's approved, I'll pick it up here.",
  ]);
  assert.deepEqual(followUpMessages, ["I'm checking a couple of sources so I can answer this cleanly."]);
});

test("emitDiscordRuntimeTerminalFailure owns terminal failure dispatch", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun({
    status: "failed",
    error_message: "Reaped by stale-lock reaper.",
  });
  const previousBotToken = process.env.DISCORD_BOT_TOKEN;
  process.env.DISCORD_BOT_TOKEN = "token";

  try {
    const result = await emitDiscordRuntimeTerminalFailure(
      {} as SupabaseClient,
      persistedRun,
      {
        persistRunMetadata: async (_admin, run, patch) => {
          persistedRun = {
            ...run,
            metadata: {
              ...run.metadata,
              ...patch,
            },
          };
          return persistedRun;
        },
        transport: {
          sendMessageSequence: async ({ contents }) => {
            sends.push(contents.join("\n\n"));
            return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
          },
        },
      }
    );

    assert.deepEqual(result, { owned: true, sent: true });
    assert.equal(sends[0], "Task failed. Reaped by stale-lock reaper.");
    assert.equal(
      persistedRun.metadata.reply_lifecycle &&
        typeof persistedRun.metadata.reply_lifecycle === "object" &&
        (persistedRun.metadata.reply_lifecycle as { terminal_kind?: string }).terminal_kind,
      "failure"
    );
  } finally {
    if (previousBotToken === undefined) {
      delete process.env.DISCORD_BOT_TOKEN;
    } else {
      process.env.DISCORD_BOT_TOKEN = previousBotToken;
    }
  }
});

test("dispatchDiscordRuntimeTerminalSuccess sends terminal answers through the active orchestrator", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun();
  const previousBotToken = process.env.DISCORD_BOT_TOKEN;
  process.env.DISCORD_BOT_TOKEN = "token";

  try {
    const result = await dispatchDiscordRuntimeTerminalSuccess(
      {} as SupabaseClient,
      persistedRun,
      {
        responseText: "There were 128 visitors in the last 24 hours.",
        skipFinalSend: false,
        terminalState: "completed",
        toolSummary: "integration_api_call:success",
        progressUpdatesSentCount: 1,
        persistRunMetadata: async (_admin, run, patch) => {
          persistedRun = {
            ...run,
            metadata: {
              ...run.metadata,
              ...patch,
            },
          };
          return persistedRun;
        },
        transport: {
          sendMessageSequence: async ({ contents }) => {
            sends.push(contents.join("\n\n"));
            return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
          },
        },
      }
    );

    assert.deepEqual(result, {
      owned: true,
      sent: true,
      terminalKind: "answer",
      text: "There were 128 visitors in the last 24 hours.",
      messageIds: [],
      partsSent: 1,
    });
    assert.equal(sends[0], "There were 128 visitors in the last 24 hours.");
    assert.equal(
      persistedRun.metadata.reply_lifecycle &&
        typeof persistedRun.metadata.reply_lifecycle === "object" &&
        (persistedRun.metadata.reply_lifecycle as { terminal_kind?: string }).terminal_kind,
      "answer"
    );
    assert.equal(
      persistedRun.metadata.reply_lifecycle &&
        typeof persistedRun.metadata.reply_lifecycle === "object" &&
        (persistedRun.metadata.reply_lifecycle as { last_visible_kind?: string }).last_visible_kind,
      "terminal_answer"
    );
  } finally {
    if (previousBotToken === undefined) {
      delete process.env.DISCORD_BOT_TOKEN;
    } else {
      process.env.DISCORD_BOT_TOKEN = previousBotToken;
    }
  }
});

test("dispatchDiscordRuntimeTerminalSuccess records attachment fallback through the active orchestrator", async () => {
  const sends: Array<{ kind: string; content: string; fileCount?: number }> = [];
  let persistedRun = buildRun({
    id: "run-attachment-fallback",
  });
  const previousBotToken = process.env.DISCORD_BOT_TOKEN;
  process.env.DISCORD_BOT_TOKEN = "token";

  try {
    const result = await dispatchDiscordRuntimeTerminalSuccess(
      {} as SupabaseClient,
      persistedRun,
      {
        responseText: "There were 128 visitors in the last 24 hours.",
        skipFinalSend: false,
        terminalState: "completed",
        toolSummary: "integration_api_call:success",
        progressUpdatesSentCount: 1,
        pendingFiles: [
          {
            fileName: "report.csv",
            fileType: "csv",
            contentType: "text/csv",
            data: Buffer.from("col\n1\n", "utf-8"),
            sizeBytes: 6,
          },
        ],
        persistRunMetadata: async (_admin, run, patch) => {
          persistedRun = {
            ...run,
            metadata: {
              ...run.metadata,
              ...patch,
            },
          };
          return persistedRun;
        },
        transport: {
          sendMessageSequence: async ({ contents }) => {
            sends.push({ kind: "sequence", content: contents.join("\n\n") });
            return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
          },
          sendMessageWithFiles: async ({ content, files }) => {
            sends.push({ kind: "files_attempt", content, fileCount: files.length });
            throw new Error("upload failed");
          },
        },
      }
    );

    assert.deepEqual(result, {
      owned: true,
      sent: true,
      terminalKind: "answer",
      text: "There were 128 visitors in the last 24 hours.",
      messageIds: [],
      partsSent: 1,
    });
    assert.deepEqual(sends, [
      {
        kind: "files_attempt",
        content: "There were 128 visitors in the last 24 hours.",
        fileCount: 1,
      },
      {
        kind: "sequence",
        content: "There were 128 visitors in the last 24 hours.",
      },
    ]);
    assert.match(
      String(
        persistedRun.metadata.reply_lifecycle &&
          typeof persistedRun.metadata.reply_lifecycle === "object" &&
          (persistedRun.metadata.reply_lifecycle as { last_attachment_error?: string })
            .last_attachment_error
      ),
      /Failed to send terminal reply with attachments/
    );
    assert.ok(
      typeof (
        persistedRun.metadata.reply_lifecycle &&
        typeof persistedRun.metadata.reply_lifecycle === "object" &&
        (persistedRun.metadata.reply_lifecycle as {
          last_attachment_fallback_at?: string;
        }).last_attachment_fallback_at
      ) === "string"
    );
  } finally {
    if (previousBotToken === undefined) {
      delete process.env.DISCORD_BOT_TOKEN;
    } else {
      process.env.DISCORD_BOT_TOKEN = previousBotToken;
    }
  }
});

test("dispatchDiscordRuntimeTerminalFailure sends through the active orchestrator and persists visibility", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun({
    status: "failed",
    error_message: "Rejected via tenant approval queue.",
  });
  const previousBotToken = process.env.DISCORD_BOT_TOKEN;
  process.env.DISCORD_BOT_TOKEN = "token";

  try {
    const result = await dispatchDiscordRuntimeTerminalFailure(
      {} as SupabaseClient,
      persistedRun,
      {
        persistRunMetadata: async (_admin, run, patch) => {
          persistedRun = {
            ...run,
            metadata: {
              ...run.metadata,
              ...patch,
            },
          };
          return persistedRun;
        },
        transport: {
          sendMessageSequence: async ({ contents }) => {
            sends.push(contents.join("\n\n"));
            return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
          },
        },
      }
    );

    assert.deepEqual(result, { owned: true, sent: true });
    assert.equal(sends[0], "Task failed. Rejected via tenant approval queue.");
    assert.equal(
      persistedRun.metadata.reply_lifecycle &&
        typeof persistedRun.metadata.reply_lifecycle === "object" &&
        (persistedRun.metadata.reply_lifecycle as { terminal_kind?: string }).terminal_kind,
      "failure"
    );
    assert.ok(
      persistedRun.metadata.reply_lifecycle &&
        typeof persistedRun.metadata.reply_lifecycle === "object" &&
        typeof (persistedRun.metadata.reply_lifecycle as { terminal_sent_at?: string })
          .terminal_sent_at === "string"
    );
  } finally {
    if (previousBotToken === undefined) {
      delete process.env.DISCORD_BOT_TOKEN;
    } else {
      process.env.DISCORD_BOT_TOKEN = previousBotToken;
    }
  }
});

// --- Post-terminal suppression ---

test("emitToolPhase returns false after finalizeSuccess", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-post-terminal-1",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        sends.push(content);
        return { messageId: `msg-${sends.length}`, status: 200 };
      },
      sendMessageSequence: async ({ contents }) => {
        sends.push(contents.join("\n\n"));
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
    },
  });

  await orchestrator.finalizeSuccess({
    responseText: "There were 128 visitors in the last 24 hours.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "api_call:success",
    progressUpdatesSentCount: 0,
  });

  const postTerminal = await orchestrator.emitToolPhase({ phaseKey: "web_search" });
  assert.equal(postTerminal, false);
});

test("emitKeepalive returns false after finalizeFailure", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-post-terminal-2",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessageSequence: async ({ contents }) => {
        sends.push(contents.join("\n\n"));
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
    },
  });

  await orchestrator.finalizeFailure("Something went wrong.");
  const postTerminal = await orchestrator.emitKeepalive();
  assert.equal(postTerminal, false);
});

// --- Terminal dedupe ---

test("second finalizeSuccess returns finalReplySent false", async () => {
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-dedupe-1",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessageSequence: async ({ contents }) => {
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
    },
  });

  const first = await orchestrator.finalizeSuccess({
    responseText: "Answer 1.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "",
    progressUpdatesSentCount: 0,
  });
  const second = await orchestrator.finalizeSuccess({
    responseText: "Answer 2.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "",
    progressUpdatesSentCount: 0,
  });

  assert.equal(first.finalReplySent, true);
  assert.equal(second.finalReplySent, false);
});

test("finalizeFailure after finalizeSuccess returns finalReplySent false", async () => {
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-dedupe-2",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessageSequence: async ({ contents }) => {
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
    },
  });

  const success = await orchestrator.finalizeSuccess({
    responseText: "Done with 128 results from the API query.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "",
    progressUpdatesSentCount: 0,
  });
  const failure = await orchestrator.finalizeFailure("late error");

  assert.equal(success.finalReplySent, true);
  assert.equal(failure.finalReplySent, false);
});

// --- Delivery failure safety ---

test("failed send does not add sentKey to lifecycle; retry with same key succeeds", async () => {
  let sendShouldFail = true;
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-delivery-fail",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessage: async () => {
        if (sendShouldFail) {
          throw new Error("Discord 500");
        }
        return { messageId: "msg-1", status: 200 };
      },
    },
  });

  const firstAttempt = await orchestrator.emitToolPhase({ phaseKey: "web_search" });
  assert.equal(firstAttempt, false);
  assert.equal(orchestrator.getLifecycle().sent_keys.includes("phase:web_search"), false);

  sendShouldFail = false;
  const retryAttempt = await orchestrator.emitToolPhase({ phaseKey: "web_search" });
  assert.equal(retryAttempt, true);
  assert.equal(orchestrator.getLifecycle().sent_keys.includes("phase:web_search"), true);
});

// --- blocked_on_approval through orchestrator ---

test("emitToolPhase returns false after emitApprovalRequested, state stays blocked", async () => {
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-blocked-1",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessage: async () => {
        return { messageId: "msg-1", status: 200 };
      },
    },
  });

  await orchestrator.emitApprovalRequested({ approvalId: "a-1", requiredRole: "owner" });
  assert.equal(orchestrator.getLifecycle().state, "blocked_on_approval");

  const milestone = await orchestrator.emitToolPhase({ phaseKey: "api_call" });
  assert.equal(milestone, false);
  assert.equal(orchestrator.getLifecycle().state, "blocked_on_approval");
});

test("emitApprovalGranted with wrong approvalId returns false", async () => {
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-blocked-2",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessage: async () => {
        return { messageId: "msg-1", status: 200 };
      },
    },
  });

  await orchestrator.emitApprovalRequested({ approvalId: "a-1" });
  const granted = await orchestrator.emitApprovalGranted({ approvalId: "wrong-id" });
  assert.equal(granted, false);
  assert.equal(orchestrator.getLifecycle().state, "blocked_on_approval");
});

test("emitIntermediateText suppressed during blocked_on_approval", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-blocked-3",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        sends.push(content);
        return { messageId: "msg-1", status: 200 };
      },
    },
  });

  await orchestrator.emitApprovalRequested({ approvalId: "a-1" });
  const intermediate = await orchestrator.emitIntermediateText(
    "The Discourse docs show that /about.json returns active_users_last_day for the last 24 hours."
  );
  assert.equal(intermediate, false);
  assert.equal(sends.length, 1); // only the approval_blocked message
});

// --- Keepalive max count ---

test("orchestrator with keepalive_count at max suppresses emitKeepalive", async () => {
  const lifecycle = {
    ...buildDefaultDiscordReplyLifecycleMetadata(),
    state: "active" as const,
    keepalive_count: 3,
    last_visible_event_at: new Date(Date.now() - 60_000).toISOString(),
  };
  let persistedRun = buildRun({
    metadata: { reply_lifecycle: lifecycle },
  });

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-keepalive-max",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessage: async () => {
        return { messageId: "msg-1", status: 200 };
      },
    },
  });

  const result = await orchestrator.emitKeepalive();
  assert.equal(result, false);
});

// --- Cadence spacing ---

test("second milestone immediately after first is suppressed by cadence window", async () => {
  const sends: string[] = [];
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-cadence",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessage: async ({ content }) => {
        sends.push(content);
        return { messageId: `msg-${sends.length}`, status: 200 };
      },
    },
  });

  const first = await orchestrator.emitToolPhase({ phaseKey: "web_search" });
  assert.equal(first, true);

  // Immediately emit another — should be blocked by cadence
  const second = await orchestrator.emitToolPhase({
    phaseKey: "integration_api_call",
    sentKey: "phase:integration_api_call",
  });
  assert.equal(second, false);
  assert.equal(sends.length, 1);
});

// --- Behavioral regressions ---

test("weak candidate produces terminal summary starting with Task complete", async () => {
  let persistedRun = buildRun();

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-weak-candidate",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessageSequence: async ({ contents }) => {
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
    },
  });

  const result = await orchestrator.finalizeSuccess({
    responseText: "Done! I web searched.",
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "web_search:success",
    progressUpdatesSentCount: 1,
  });

  assert.equal(result.terminalKind, "summary");
  assert.ok(result.text.startsWith("Task complete."));
});

test("strong answer with numbers and length >= 60 produces terminal_answer", async () => {
  let persistedRun = buildRun();
  let sentText = "";

  const orchestrator = new DiscordRuntimeReplyOrchestrator({
    admin: {} as SupabaseClient,
    run: persistedRun,
    botToken: "token",
    channelId: "channel-strong-answer",
    persistRunMetadata: async (_admin, run, patch) => {
      persistedRun = { ...run, metadata: { ...run.metadata, ...patch } };
      return persistedRun;
    },
    transport: {
      sendMessageSequence: async ({ contents }) => {
        sentText = contents.join("\n\n");
        return { messageIds: ["msg-seq"], status: 200, partsSent: contents.length };
      },
    },
  });

  const responseText =
    "I recreated the Discourse integration and confirmed the API returned 200 OK with 128 visitors.";
  const result = await orchestrator.finalizeSuccess({
    responseText,
    skipFinalSend: false,
    terminalState: "completed",
    toolSummary: "integration_api_call:success",
    progressUpdatesSentCount: 1,
  });

  assert.equal(result.terminalKind, "answer");
  assert.equal(sentText, responseText);
});
