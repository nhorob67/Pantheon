import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./client";

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
    .select("id, email, password_encrypted")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "payment_processing")
    .single();

  if (!signup) {
    // This is a renewal invoice for an existing customer — nothing to do
    return;
  }

  // Decrypt password and create Supabase auth user
  const { decrypt } = await import("@/lib/crypto");
  const password = decrypt(signup.password_encrypted);

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: signup.email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    throw new Error(
      `Failed to create auth user: ${authError?.message ?? "unknown error"}`
    );
  }

  // Retrieve subscription to extract metered item ID
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data"],
  });
  const meteredItem = subscription.items.data.find(
    (i) => i.price.recurring?.usage_type === "metered"
  );

  // Upsert customer record
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { error: customerError } = await supabase.from("customers").upsert(
    {
      user_id: authData.user.id,
      email: signup.email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
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
