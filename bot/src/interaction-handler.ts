import type { Interaction } from "discord.js";

const PANTHEON_API_URL = process.env.PANTHEON_API_URL || "http://localhost:3000";
const PANTHEON_BOT_SECRET = process.env.PANTHEON_BOT_SECRET;
const DECISION_PATH = "/api/admin/tenants/runtime/discord/approval-decision";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  const isApprove = customId.startsWith("pa:");
  const isReject = customId.startsWith("pr:");

  if (!isApprove && !isReject) return;

  // Parse tenant and approval IDs: "pa:<tenantId>:<approvalId>"
  const parts = customId.split(":");
  if (parts.length !== 3) {
    await interaction.reply({ content: "Invalid button data.", ephemeral: true });
    return;
  }

  const [, tenantId, approvalId] = parts;
  const decision = isApprove ? "approved" : "rejected";

  // Acknowledge within 3 seconds
  await interaction.deferUpdate();

  const url = `${PANTHEON_API_URL}${DECISION_PATH}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (PANTHEON_BOT_SECRET) {
    headers["Authorization"] = `Bearer ${PANTHEON_BOT_SECRET}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenant_id: tenantId,
        approval_id: approvalId,
        discord_user_id: interaction.user.id,
        decision,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      const errorMessage =
        typeof body.error === "string" ? body.error : `Request failed (${response.status})`;

      await interaction.followUp({ content: errorMessage, ephemeral: true });
      return;
    }

    // Success — the API endpoint already edits the Discord message
  } catch (error) {
    console.error("[bot] Approval decision request failed:", error);
    await interaction.followUp({
      content: "Failed to process decision — please use the web dashboard.",
      ephemeral: true,
    });
  }
}
