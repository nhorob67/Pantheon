import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Pin to pre-meter API version until metered prices are migrated to Stripe Meters
      apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

export async function createPortalSession(stripeCustomerId: string) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return session;
}
