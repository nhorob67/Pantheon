import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./client";
import { completePendingSignup } from "./complete-pending-signup";

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  const subscription = parent?.subscription_details?.subscription;
  if (typeof subscription === "string") {
    return subscription;
  }

  if (
    subscription &&
    typeof subscription === "object" &&
    "id" in subscription &&
    typeof subscription.id === "string"
  ) {
    return subscription.id;
  }

  return null;
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const supabase = createAdminClient();
  const email = session.metadata?.customer_email;
  if (!email) return;

  // Extract metered subscription item ID from the new subscription
  let meteredItemId: string | null = null;
  const subscriptionId = session.subscription as string;
  if (subscriptionId) {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data"],
    });
    const meteredItem = subscription.items.data.find(
      (i) => i.price.recurring?.usage_type === "metered"
    );
    meteredItemId = meteredItem?.id ?? null;
  }

  const upsertData: Record<string, unknown> = {
    email,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscriptionId,
    subscription_status: "active",
    plan: "standard",
    stripe_metered_item_id: meteredItemId,
  };

  // Link to Supabase auth user if present (embedded checkout flow)
  const userId = session.metadata?.user_id;
  if (userId) {
    upsertData.user_id = userId;
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .upsert(upsertData, { onConflict: "email" })
    .select("id, email")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!customer) {
    return;
  }
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const supabase = createAdminClient();

  // Extract metered item ID if present in webhook payload
  const meteredItem = subscription.items?.data.find(
    (i) => i.price.recurring?.usage_type === "metered"
  );

  const updateData: Record<string, unknown> = {
    subscription_status: subscription.status,
  };
  if (meteredItem) {
    updateData.stripe_metered_item_id = meteredItem.id;
  }

  const { error } = await supabase
    .from("customers")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const supabase = createAdminClient();

  await supabase
    .from("customers")
    .update({ subscription_status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  // TODO: In multi-tenant SaaS model, subscription cancellation disables
  // the tenant's access. Per-instance VPS deprovisioning is no longer needed.
}

export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = createAdminClient();

  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  // Check if this is a new signup (pending_signups row exists)
  const { data: signup } = await supabase
    .from("pending_signups")
    .select("id, email, password_encrypted, stripe_subscription_id, status")
    .eq("stripe_subscription_id", subscriptionId)
    .in("status", ["payment_processing", "completed"])
    .single();

  if (!signup) {
    // This is a renewal invoice for an existing customer — nothing to do
    return;
  }

  // If the sync polling path already completed this signup, skip
  if (signup.status === "completed") {
    return;
  }

  await completePendingSignup(signup);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createAdminClient();

  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (subscriptionId) {
    await supabase
      .from("customers")
      .update({ subscription_status: "past_due" })
      .eq("stripe_subscription_id", subscriptionId);
  }
}
