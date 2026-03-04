export const STRIPE_CONFIG = {
  priceId: process.env.STRIPE_PRICE_ID!,
  meteredPriceId: process.env.STRIPE_METERED_PRICE_ID!,
  portalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  subscriptionAmount: 5000, // $50.00
};
