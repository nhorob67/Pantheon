/**
 * One-off script to manually complete a pending signup.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/complete-signup-manual.ts
 *
 * Requires .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * ENCRYPTION_KEY, and STRIPE_SECRET_KEY.
 */

// Inline Supabase admin client (avoid Next.js-specific imports)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Inline Stripe client
import Stripe from "stripe";
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}
const stripe = new Stripe(stripeKey);

// Inline decrypt (avoid Next.js path alias)
import { createDecipheriv } from "node:crypto";

function decrypt(encoded: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("Missing ENCRYPTION_KEY");
  const keyBuf = Buffer.from(key, "base64");

  const parts = encoded.split(":");
  let ivHex: string, ciphertextHex: string, tagHex: string;

  if (parts.length === 4 && parts[0] === "v1") {
    [, ivHex, ciphertextHex, tagHex] = parts;
  } else if (parts.length === 3) {
    [ivHex, ciphertextHex, tagHex] = parts;
  } else {
    throw new Error("Invalid encrypted payload format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBuf,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ---

const EMAIL = "nickhorob@gmail.com";

async function main() {
  console.log(`Looking up pending signup for ${EMAIL}...`);

  const { data: signup, error: lookupErr } = await supabase
    .from("pending_signups")
    .select("id, email, password_encrypted, stripe_subscription_id, status")
    .eq("email", EMAIL)
    .single();

  if (lookupErr || !signup) {
    console.error("No pending signup found:", lookupErr?.message);
    process.exit(1);
  }

  console.log(`Found signup: id=${signup.id}, status=${signup.status}, sub=${signup.stripe_subscription_id}`);

  if (signup.status === "completed") {
    console.log("Signup already completed — nothing to do.");
    return;
  }

  // Decrypt password
  const password = decrypt(signup.password_encrypted);
  console.log("Password decrypted successfully.");

  // Create auth user
  let userId: string;
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: signup.email,
      password,
      email_confirm: true,
    });

  if (authError) {
    if (
      authError.message.includes("already been registered") ||
      authError.message.includes("already exists")
    ) {
      console.log("Auth user already exists, looking up...");
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find((u) => u.email === signup.email);
      if (!existing) {
        console.error("Auth user exists but not found in listUsers");
        process.exit(1);
      }
      userId = existing.id;
    } else {
      console.error("Failed to create auth user:", authError.message);
      process.exit(1);
    }
  } else {
    userId = authData.user!.id;
  }

  console.log(`Auth user ready: ${userId}`);

  // Retrieve subscription for metered item
  const subscription = await stripe.subscriptions.retrieve(
    signup.stripe_subscription_id,
    { expand: ["items.data"] }
  );
  const meteredItem = subscription.items.data.find(
    (i) => i.price.recurring?.usage_type === "metered"
  );
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  console.log(`Stripe sub status: ${subscription.status}, customer: ${stripeCustomerId}`);

  // Upsert customer
  const { error: customerError } = await supabase.from("customers").upsert(
    {
      user_id: userId,
      email: signup.email,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: signup.stripe_subscription_id,
      stripe_metered_item_id: meteredItem?.id ?? null,
      subscription_status: "active",
      plan: "standard",
    },
    { onConflict: "email" }
  );

  if (customerError) {
    console.error("Failed to upsert customer:", customerError.message);
    process.exit(1);
  }

  // Mark signup completed
  await supabase
    .from("pending_signups")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", signup.id);

  console.log("Done! Customer record created. User can now sign in.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
