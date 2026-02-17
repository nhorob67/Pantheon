/**
 * One-time migration: encrypts any plaintext Discord tokens in instances.channel_config
 * and removes the plaintext `token` key.
 *
 * Usage: npx tsx scripts/migrate-plaintext-tokens.ts
 *
 * Requires ENCRYPTION_KEY and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "../src/lib/crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!process.env.ENCRYPTION_KEY) {
  console.error("Missing ENCRYPTION_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: instances, error } = await supabase
    .from("instances")
    .select("id, channel_config")
    .not("channel_config", "is", null);

  if (error) {
    console.error("Failed to fetch instances:", error.message);
    process.exit(1);
  }

  let migrated = 0;
  let skipped = 0;

  for (const instance of instances || []) {
    const config = instance.channel_config as Record<string, unknown> | null;
    if (!config) {
      skipped++;
      continue;
    }

    const plaintextToken = config.token;
    if (typeof plaintextToken !== "string" || plaintextToken.length === 0) {
      skipped++;
      continue;
    }

    // Already has encrypted version — just remove plaintext
    const alreadyEncrypted =
      typeof config.token_encrypted === "string" &&
      config.token_encrypted.length > 0;

    const updatedConfig = { ...config };
    if (!alreadyEncrypted) {
      updatedConfig.token_encrypted = encrypt(plaintextToken);
    }
    delete updatedConfig.token;

    const { error: updateError } = await supabase
      .from("instances")
      .update({ channel_config: updatedConfig })
      .eq("id", instance.id);

    if (updateError) {
      console.error(`Failed to update instance ${instance.id}:`, updateError.message);
    } else {
      migrated++;
      console.log(`Migrated instance ${instance.id}`);
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
}

main();
