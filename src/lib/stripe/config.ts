export const STRIPE_CONFIG = {
  priceId: process.env.STRIPE_PRICE_ID!,
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup`,
  portalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  subscriptionAmount: 4000, // $40.00
};
