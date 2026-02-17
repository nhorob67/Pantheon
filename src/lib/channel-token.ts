import { decrypt } from "@/lib/crypto";

interface ChannelConfig {
  token?: unknown;
  token_encrypted?: unknown;
}

/**
 * Resolves Discord bot token from instance.channel_config.
 * Supports legacy plaintext (`token`) and current encrypted (`token_encrypted`) formats.
 */
export function getDiscordTokenFromChannelConfig(channelConfig: unknown): string {
  const config = (channelConfig ?? {}) as ChannelConfig;

  if (typeof config.token === "string" && config.token.length > 0) {
    throw new Error(
      "Plaintext Discord token detected in channel_config. " +
      "Run `npx tsx scripts/migrate-plaintext-tokens.ts` to encrypt all tokens, then remove the plaintext 'token' key."
    );
  }

  if (
    typeof config.token_encrypted === "string" &&
    config.token_encrypted.length > 0
  ) {
    try {
      return decrypt(config.token_encrypted);
    } catch {
      throw new Error("Failed to decrypt Discord token");
    }
  }

  throw new Error("Discord token is missing from instance channel configuration");
}
