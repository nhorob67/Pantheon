import { schedules } from "@trigger.dev/sdk";
import Stripe from "stripe";
import { createTriggerAdminClient } from "./lib/supabase";
import { calculateOverage } from "@/lib/stripe/overage";

function toSafeNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export const reportStripeUsage = schedules.task({
  id: "report-stripe-usage",
  cron: "55 23 * * *", // Daily at 23:55 UTC
  retry: {
    maxAttempts: 3,
  },
  run: async () => {
    const admin = createTriggerAdminClient();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });

    // Get all active customers with metered billing configured
    const { data: customers, error: custError } = await admin
      .from("customers")
      .select(
        "id, stripe_metered_item_id, spending_cap_cents, spending_paused_at"
      )
      .eq("subscription_status", "active")
      .not("stripe_metered_item_id", "is", null);

    if (custError) throw new Error(custError.message);
    if (!customers || customers.length === 0) {
      return { reported: 0, unpaused: 0, skipped: 0 };
    }

    // Get month-to-date spending for all customers
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const { data: spendingRows, error: spendError } = await admin.rpc(
      "customer_monthly_spending_snapshot",
      { p_start_date: startOfMonthStr, p_today: today }
    );

    if (spendError) throw new Error(spendError.message);

    const spendingByCustomer = new Map<string, number>();
    for (const row of (spendingRows || []) as Array<{
      customer_id: string;
      total_cost_cents: unknown;
    }>) {
      spendingByCustomer.set(
        row.customer_id,
        toSafeNumber(row.total_cost_cents)
      );
    }

    let reported = 0;
    let unpaused = 0;
    let skipped = 0;

    for (const customer of customers) {
      const totalCostCents = spendingByCustomer.get(customer.id) || 0;
      const { units } = calculateOverage(totalCostCents);

      // Report usage to Stripe (action: 'set' is idempotent — safe to re-run)
      // TODO: migrate to stripe.billing.meterEvents.create() for Stripe SDK v20+
      try {
        // @ts-expect-error createUsageRecord removed from v20 types but still works at runtime
        await stripe.subscriptionItems.createUsageRecord(
          customer.stripe_metered_item_id!,
          {
            quantity: units,
            action: "set",
            timestamp: "now",
          }
        );
        reported++;
      } catch (err) {
        console.error(
          `[report-stripe-usage] Failed for customer ${customer.id}:`,
          err
        );
        skipped++;
      }

      // Auto-unpause: if paused but usage is now below cap (new billing period)
      if (customer.spending_paused_at && customer.spending_cap_cents) {
        if (totalCostCents < customer.spending_cap_cents) {
          await admin
            .from("customers")
            .update({ spending_paused_at: null })
            .eq("id", customer.id);
          unpaused++;
        }
      }
    }

    return { reported, unpaused, skipped };
  },
});
