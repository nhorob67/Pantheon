import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_CONFIG } from "@/lib/stripe/config";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("id, email, subscription_status, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (customer.subscription_status === "active") {
    return NextResponse.json(
      { error: "You already have an active subscription." },
      { status: 400 }
    );
  }

  const stripe = getStripe();

  // Create Stripe customer if trial user doesn't have one
  let stripeCustomerId = customer.stripe_customer_id;
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      email: customer.email,
      metadata: { farmclaw_customer_id: customer.id, user_id: user.id },
    });
    stripeCustomerId = stripeCustomer.id;

    await admin
      .from("customers")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", customer.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [
      { price: STRIPE_CONFIG.priceId, quantity: 1 },
      { price: STRIPE_CONFIG.meteredPriceId },
    ],
    metadata: {
      customer_email: customer.email,
      user_id: user.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
