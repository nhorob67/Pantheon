import type { Message } from "discord.js";

const FARMCLAW_API_URL = process.env.FARMCLAW_API_URL || "http://localhost:3000";
const FARMCLAW_BOT_SECRET = process.env.FARMCLAW_BOT_SECRET;
const INGRESS_PATH = "/api/admin/tenants/runtime/discord/ingress";

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages (including self)
  if (message.author.bot) return;

  // Ignore messages without text content
  if (!message.content && message.attachments.size === 0) return;

  // Send typing indicator while processing
  try {
    await message.channel.sendTyping();
  } catch {
    // Non-critical, continue
  }

  const payload = {
    guild_id: message.guildId ?? null,
    channel_id: message.channelId,
    user_id: message.author.id,
    username: message.author.username,
    content: message.content || "",
    message_id: message.id,
    attachments: message.attachments.map((a) => ({
      id: a.id,
      url: a.url,
      filename: a.name,
      content_type: a.contentType,
      size: a.size,
    })),
  };

  const requestId = `bot-${message.id}-${Date.now()}`;
  const url = `${FARMCLAW_API_URL}${INGRESS_PATH}`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-idempotency-key": message.id,
      "x-request-id": requestId,
    };

    if (FARMCLAW_BOT_SECRET) {
      headers["Authorization"] = `Bearer ${FARMCLAW_BOT_SECRET}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[bot] Ingress failed: ${response.status} ${response.statusText}`,
        body.slice(0, 500)
      );
    }
  } catch (error) {
    console.error("[bot] Failed to POST to ingress:", error);
  }
}
