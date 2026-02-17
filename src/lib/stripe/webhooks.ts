import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { deprovisionInstance } from "@/lib/infra/deprovision";

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

  const { data: customer, error } = await supabase
    .from("customers")
    .upsert(
      {
        email,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_status: "active",
        plan: "standard",
      },
      { onConflict: "email" }
    )
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

  const { error } = await supabase
    .from("customers")
    .update({
      subscription_status: subscription.status,
    })
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

  // Deprovision the customer's instance (dedicated VPS cleanup)
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (customer) {
    const { data: instance } = await supabase
      .from("instances")
      .select("id, status")
      .eq("customer_id", customer.id)
      .single();

    if (instance && instance.status !== "deprovisioned" && instance.status !== "deprovisioning") {
      await deprovisionInstance(instance.id).catch((err) => {
        console.error(`Deprovision failed for instance ${instance.id}:`, err);
      });
    }
  }
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
