#!/usr/bin/env npx tsx
/**
 * One-time migration script: encrypt plaintext MCP server secrets.
 *
 * Usage: ENCRYPTION_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/encrypt-mcp-secrets.ts
 *
 * Safe to run multiple times — already-encrypted values are skipped.
 */
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "../src/lib/crypto";

const ENCRYPTED_PREFIX = "v1:";

function isEncrypted(value: string): boolean {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return false;
  return value.split(":").length === 4;
}

function encryptRecord(vars: Record<string, string>): { record: Record<string, string>; changed: number } {
  const result: Record<string, string> = {};
  let changed = 0;
  for (const [key, value] of Object.entries(vars)) {
    if (isEncrypted(value)) {
      result[key] = value;
    } else {
      result[key] = encrypt(value);
      changed++;
    }
  }
  return { record: result, changed };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error("ENCRYPTION_KEY is required");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, supabaseKey);

  const { data: rows, error } = await admin
    .from("mcp_server_configs")
    .select("id, env_vars, headers");

  if (error) {
    console.error("Failed to fetch MCP servers:", error.message);
    process.exit(1);
  }

  let totalMigrated = 0;

  for (const row of rows ?? []) {
    const envVars = (typeof row.env_vars === "object" && row.env_vars !== null && !Array.isArray(row.env_vars))
      ? row.env_vars as Record<string, string>
      : {};
    const headers = (typeof row.headers === "object" && row.headers !== null && !Array.isArray(row.headers))
      ? row.headers as Record<string, string>
      : {};

    const hasEnvVars = Object.keys(envVars).length > 0;
    const hasHeaders = Object.keys(headers).length > 0;

    if (!hasEnvVars && !hasHeaders) continue;

    const envResult = hasEnvVars ? encryptRecord(envVars) : { record: {}, changed: 0 };
    const headerResult = hasHeaders ? encryptRecord(headers) : { record: {}, changed: 0 };

    if (envResult.changed === 0 && headerResult.changed === 0) continue;

    const update: Record<string, unknown> = {};
    if (envResult.changed > 0) update.env_vars = envResult.record;
    if (headerResult.changed > 0) update.headers = headerResult.record;

    const { error: updateError } = await admin
      .from("mcp_server_configs")
      .update(update)
      .eq("id", row.id);

    if (updateError) {
      console.error(`Failed to update server ${row.id}:`, updateError.message);
      continue;
    }

    totalMigrated++;
    console.log(`Encrypted server ${row.id}: ${envResult.changed} env_vars, ${headerResult.changed} headers`);
  }

  console.log(`\nDone. Migrated ${totalMigrated} server(s).`);
}

main();
