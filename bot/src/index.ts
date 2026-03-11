import { Client, GatewayIntentBits, Partials } from "discord.js";
import { handleMessage } from "./message-handler.ts";
import { startHealthServer } from "./health.ts";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN is required");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel], // Required for DM support
});

client.once("ready", (c) => {
  console.log(`[bot] Ready as ${c.user.tag} in ${c.guilds.cache.size} guilds`);
  for (const [id, guild] of c.guilds.cache) {
    console.log(`[bot] Guild: ${guild.name} (${id})`);
  }
});

client.on("messageCreate", (message) => {
  console.log(`[bot] messageCreate: guild=${message.guildId} channel=${message.channelId} author=${message.author.tag} bot=${message.author.bot} content=${message.content.slice(0, 50)}`);
  handleMessage(message).catch((err) => {
    console.error("[bot] Unhandled message error:", err);
  });
});

client.on("error", (error) => {
  console.error("[bot] Client error:", error);
});

client.on("warn", (warning) => {
  console.warn("[bot] Warning:", warning);
});

startHealthServer();
client.login(DISCORD_BOT_TOKEN);
