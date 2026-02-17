import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { decrypt } from "@/lib/crypto";

const bootKeySchema = z.object({
  boot_token: z.string().min(1),
});

/**
 * Unauthenticated endpoint — the boot token IS the authentication.
 * Called once by cloud-init during VPS provisioning to fetch the LUKS passphrase.
 */
export async function POST(request: Request) {
  // Rate-limit by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  const allowed = await consumeDurableRateLimit({
    action: "boot-key",
    key: ip,
    windowSeconds: 300,
    maxAttempts: 5,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bootKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_boot_token", {
    p_token: parsed.data.boot_token,
  });

  if (error) {
    console.error("[boot-key] RPC error:", error.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  // consume_boot_token returns an array of rows; empty = invalid/expired/consumed
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0 || !rows[0]?.luks_passphrase_encrypted) {
    return NextResponse.json(
      { error: "Invalid or expired boot token" },
      { status: 403 }
    );
  }

  try {
    const passphrase = decrypt(rows[0].luks_passphrase_encrypted);
    return NextResponse.json({ passphrase });
  } catch {
    console.error("[boot-key] Failed to decrypt LUKS passphrase");
    return NextResponse.json({ error: "Decryption failed" }, { status: 500 });
  }
}
