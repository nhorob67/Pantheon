/**
 * One-time migration script: swap existing $40 subscriptions to $50 + metered billing.
 *
 * For each active customer with a Stripe subscription:
 * 1. Retrieve the subscription and find the old fixed-price item
 * 2. Update the subscription: swap to new $50 price + add metered price
 * 3. Extract the metered item ID and store in Supabase
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... \
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   STRIPE_PRICE_ID=price_new_50 \
 *   STRIPE_METERED_PRICE_ID=price_metered \
 *   STRIPE_OLD_PRICE_ID=price_old_40 \
 *   npx tsx scripts/migrate-to-metered-billing.ts
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const NEW_FIXED_PRICE_ID = process.env.STRIPE_PRICE_ID!;
const METERED_PRICE_ID = process.env.STRIPE_METERED_PRICE_ID!;
const OLD_PRICE_ID = process.env.STRIPE_OLD_PRICE_ID!;

async function main() {
  if (!OLD_PRICE_ID) {
    console.error("STRIPE_OLD_PRICE_ID is required");
    process.exit(1);
  }

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, email, stripe_subscription_id")
    .eq("subscription_status", "active")
    .not("stripe_subscription_id", "is", null);

  if (error) {
    console.error("Failed to fetch customers:", error.message);
    process.exit(1);
  }

  console.log(`Found ${customers.length} active customers to migrate`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const customer of customers) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        customer.stripe_subscription_id!
      );

      // Find the old $40 price item
      const oldItem = subscription.items.data.find(
        (i) => i.price.id === OLD_PRICE_ID
      );

      if (!oldItem) {
        console.log(
          `  [SKIP] ${customer.email} — old price item not found (already migrated?)`
        );
        skipped++;
        continue;
      }

      // Check if metered item already exists
      const existingMetered = subscription.items.data.find(
        (i) => i.price.recurring?.usage_type === "metered"
      );

      if (existingMetered) {
        console.log(
          `  [SKIP] ${customer.email} — already has metered item ${existingMetered.id}`
        );
        skipped++;
        continue;
      }

      // Swap: remove old $40 item, add new $50 item + metered item
      const updated = await stripe.subscriptions.update(subscription.id, {
        items: [
          { id: oldItem.id, price: NEW_FIXED_PRICE_ID, quantity: 1 },
          { price: METERED_PRICE_ID },
        ],
        proration_behavior: "create_prorations",
      });

      // Find the new metered item
      const meteredItem = updated.items.data.find(
        (i) => i.price.recurring?.usage_type === "metered"
      );

      if (!meteredItem) {
        console.error(
          `  [ERROR] ${customer.email} — subscription updated but metered item not found`
        );
        failed++;
        continue;
      }

      // Store metered item ID in Supabase
      const { error: updateError } = await supabase
        .from("customers")
        .update({ stripe_metered_item_id: meteredItem.id })
        .eq("id", customer.id);

      if (updateError) {
        console.error(
          `  [ERROR] ${customer.email} — DB update failed:`,
          updateError.message
        );
        failed++;
        continue;
      }

      console.log(
        `  [OK] ${customer.email} — metered item ${meteredItem.id}`
      );
      migrated++;
    } catch (err) {
      console.error(`  [ERROR] ${customer.email}:`, err);
      failed++;
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
