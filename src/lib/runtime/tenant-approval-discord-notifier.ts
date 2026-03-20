import type { SupabaseClient } from "@supabase/supabase-js";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

// Pantheon bronze accent: #C4883F = 12879935 decimal
const PANTHEON_EMBED_COLOR = 12879935;

export interface SendDiscordApprovalButtonMessageInput {
  tenantId: string;
  approvalId: string;
  approvalType: string;
  requiredRole: string;
  summary: string;
  expiresAt: string;
  channelId: string;
}

export interface SendDiscordApprovalButtonMessageResult {
  messageId: string | null;
  channelId: string;
}

export interface UpdateDiscordApprovalMessageInput {
  botToken: string;
  channelId: string;
  messageId: string;
  decision: "approved" | "rejected";
  decidedBy: string;
}

function buildApprovalEmbed(input: SendDiscordApprovalButtonMessageInput) {
  const expiresTimestamp = Math.floor(new Date(input.expiresAt).getTime() / 1000);

  return {
    title: "Approval Required",
    description: input.summary,
    color: PANTHEON_EMBED_COLOR,
    fields: [
      { name: "Type", value: input.approvalType, inline: true },
      { name: "Required Role", value: input.requiredRole, inline: true },
      { name: "Expires", value: `<t:${expiresTimestamp}:R>`, inline: true },
    ],
    footer: { text: `Approval ${input.approvalId.slice(0, 8)}` },
  };
}

function buildApprovalButtons(tenantId: string, approvalId: string) {
  return {
    type: 1, // ACTION_ROW
    components: [
      {
        type: 2, // BUTTON
        style: 3, // SUCCESS (green)
        label: "Approve",
        custom_id: `pa:${tenantId}:${approvalId}`,
      },
      {
        type: 2, // BUTTON
        style: 4, // DANGER (red)
        label: "Reject",
        custom_id: `pr:${tenantId}:${approvalId}`,
      },
    ],
  };
}

function buildDecisionEmbed(
  decision: "approved" | "rejected",
  decidedBy: string
) {
  const color = decision === "approved" ? 5025616 : 15158332; // green / red
  const label = decision === "approved" ? "Approved" : "Rejected";

  return {
    title: `${label}`,
    description: `Decision made by <@${decidedBy}>`,
    color,
  };
}

function buildDisabledButtons(tenantId: string, approvalId: string) {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: 2, // SECONDARY (grey)
        label: "Approve",
        custom_id: `pa:${tenantId}:${approvalId}`,
        disabled: true,
      },
      {
        type: 2,
        style: 2,
        label: "Reject",
        custom_id: `pr:${tenantId}:${approvalId}`,
        disabled: true,
      },
    ],
  };
}

function buildApprovalSummary(requestPayload: Record<string, unknown>): string {
  // Try to build a useful summary from the request payload
  if (typeof requestPayload.kind === "string" && requestPayload.kind === "heartbeat_alert") {
    const summaries = requestPayload.signal_summaries;
    if (Array.isArray(summaries) && summaries.length > 0) {
      return `Heartbeat alert: ${summaries.slice(0, 3).join(", ")}`;
    }
    return `Heartbeat alert: ${requestPayload.approval_reason || "requires approval"}`;
  }

  const toolId = requestPayload.tool_id;
  if (typeof toolId === "string") {
    return `Tool invocation: **${toolId}** requires approval before execution`;
  }

  const runKind = requestPayload.run_kind;
  if (typeof runKind === "string") {
    return `Runtime action (${runKind}) requires approval`;
  }

  return "An action requires your approval before it can proceed.";
}

function resolveChannelId(requestPayload: Record<string, unknown>): string | null {
  // Heartbeat approvals store delivery_channel_id
  if (typeof requestPayload.delivery_channel_id === "string") {
    return requestPayload.delivery_channel_id;
  }

  // Tool/runtime approvals store channel_id
  if (typeof requestPayload.channel_id === "string") {
    return requestPayload.channel_id;
  }

  return null;
}

async function resolveFirstAgentChannelBinding(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await admin
    .from("tenant_agents")
    .select("channel_bindings")
    .eq("tenant_id", tenantId)
    .limit(10);

  if (!data) return null;

  for (const agent of data) {
    const bindings = agent.channel_bindings;
    if (Array.isArray(bindings) && bindings.length > 0) {
      const first = bindings[0];
      if (typeof first === "string") return first;
      if (typeof first === "object" && first && typeof first.channel_id === "string") {
        return first.channel_id;
      }
    }
  }

  return null;
}

export async function sendDiscordApprovalButtonMessage(
  admin: SupabaseClient,
  botToken: string,
  approval: {
    id: string;
    tenant_id: string;
    approval_type: string;
    required_role: string;
    request_payload: Record<string, unknown>;
    expires_at: string;
  }
): Promise<SendDiscordApprovalButtonMessageResult | null> {
  // Resolve channel
  let channelId = resolveChannelId(approval.request_payload);
  if (!channelId) {
    channelId = await resolveFirstAgentChannelBinding(admin, approval.tenant_id);
  }
  if (!channelId) {
    return null; // No channel found — skip silently
  }

  const summary = buildApprovalSummary(approval.request_payload);

  const messageInput: SendDiscordApprovalButtonMessageInput = {
    tenantId: approval.tenant_id,
    approvalId: approval.id,
    approvalType: approval.approval_type,
    requiredRole: approval.required_role,
    summary,
    expiresAt: approval.expires_at,
    channelId,
  };

  const embed = buildApprovalEmbed(messageInput);
  const buttons = buildApprovalButtons(approval.tenant_id, approval.id);

  const response = await fetch(
    `${DISCORD_API_BASE_URL}/channels/${encodeURIComponent(channelId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
        components: [buttons],
        allowed_mentions: { parse: [] as string[] },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[approval-discord-notifier] Failed to send button message: ${response.status}`,
      body.slice(0, 500)
    );
    return null;
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  const messageId = payload && typeof payload.id === "string" ? payload.id : null;
  return { messageId, channelId };
}

export async function updateDiscordApprovalMessage(
  input: UpdateDiscordApprovalMessageInput
): Promise<void> {
  // Parse tenantId and approvalId from the message for disabled buttons
  // We'll use placeholder IDs since buttons are disabled anyway
  const embed = buildDecisionEmbed(input.decision, input.decidedBy);
  const disabledButtons = buildDisabledButtons("_", "_");

  const response = await fetch(
    `${DISCORD_API_BASE_URL}/channels/${encodeURIComponent(input.channelId)}/messages/${encodeURIComponent(input.messageId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${input.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
        components: [disabledButtons],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[approval-discord-notifier] Failed to update message: ${response.status}`,
      body.slice(0, 500)
    );
  }
}
