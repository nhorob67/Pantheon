import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./client";
import { decrypt } from "@/lib/crypto";

interface PendingSignup {
  id: string;
  email: string;
  password_encrypted: string;
  stripe_subscription_id: string;
}

/**
 * Idempotent account completion: decrypt password, create auth user,
 * retrieve metered item, upsert customer, mark signup completed.
 *
 * Safe to call from both the webhook and the synchronous polling path.
 * If the auth user already exists, it looks up the existing user and continues.
 */
export async function completePendingSignup(signup: PendingSignup) {
  const supabase = createAdminClient();
  const stripe = getStripe();

  // Decrypt password and create Supabase auth user
  const password = decrypt(signup.password_encrypted);

  let userId: string;

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: signup.email,
      password,
      email_confirm: true,
    });

  if (authError) {
    // If user already exists, look them up instead of failing
    if (
      authError.message.includes("already been registered") ||
      authError.message.includes("already exists")
    ) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const existing = authUsers?.users?.find(
        (u) => u.email === signup.email
      );
      if (!existing) {
        throw new Error(
          `Auth user reported as existing but not found: ${signup.email}`
        );
      }
      userId = existing.id;
    } else {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }
  } else if (!authData.user) {
    throw new Error("Failed to create auth user: no user returned");
  } else {
    userId = authData.user.id;
  }

  // Retrieve subscription to extract metered item ID
  const subscription = await stripe.subscriptions.retrieve(
    signup.stripe_subscription_id,
    { expand: ["items.data"] }
  );
  const meteredItem = subscription.items.data.find(
    (i) => i.price.recurring?.usage_type === "metered"
  );

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Upsert customer record (ON CONFLICT email)
  const { error: customerError } = await supabase.from("customers").upsert(
    {
      user_id: userId,
      email: signup.email,
      stripe_customer_id: customerId,
      stripe_subscription_id: signup.stripe_subscription_id,
      stripe_metered_item_id: meteredItem?.id ?? null,
      subscription_status: "active",
      plan: "standard",
    },
    { onConflict: "email" }
  );

  if (customerError) {
    throw new Error(`Failed to upsert customer: ${customerError.message}`);
  }

  // Mark signup as completed
  await supabase
    .from("pending_signups")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", signup.id);
}
