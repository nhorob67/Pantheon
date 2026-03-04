import Stripe from "stripe";
import { STRIPE_CONFIG } from "./config";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

export async function createCheckoutSession(email: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: "subscription",
    line_items: [
      { price: process.env.STRIPE_PRICE_ID!, quantity: 1 },
      { price: STRIPE_CONFIG.meteredPriceId },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup`,
    metadata: { customer_email: email },
  });

  return session;
}

export async function createEmbeddedCheckoutSession(
  email: string,
  userId: string
) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: "subscription",
    ui_mode: "embedded",
    line_items: [
      { price: process.env.STRIPE_PRICE_ID!, quantity: 1 },
      { price: STRIPE_CONFIG.meteredPriceId },
    ],
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { customer_email: email, user_id: userId },
  });

  return session;
}

export async function createPortalSession(stripeCustomerId: string) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return session;
}
