import { Client, GatewayIntentBits, Partials } from "discord.js";
import { handleMessage } from "./message-handler.js";
import { startHealthServer } from "./health.js";

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
});

client.on("messageCreate", (message) => {
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
