export interface TrialGuardResult {
  blocked: boolean;
  reason?: "spending_cap_exceeded" | "trial_expired";
  message?: string;
}

export function checkTrialAndSpendingBlock(customer: {
  subscription_status?: string;
  trial_ends_at?: string | null;
  spending_paused_at?: string | null;
}): TrialGuardResult {
  // Spending pause takes priority (applies to both trial and paid users)
  if (customer.spending_paused_at) {
    return {
      blocked: true,
      reason: "spending_cap_exceeded",
      message:
        "Your FarmClaw assistant is currently paused because your monthly spending cap has been reached. " +
        "To resume, increase your spending cap in Settings > Billing, or wait for the next billing cycle.",
    };
  }

  // Check trial expiration
  if (customer.subscription_status === "expired") {
    return {
      blocked: true,
      reason: "trial_expired",
      message:
        "Your 14-day FarmClaw trial has ended. Subscribe at https://app.farmclaw.com/settings/billing to keep your AI team running.",
    };
  }

  if (
    customer.subscription_status === "trialing" &&
    customer.trial_ends_at &&
    new Date(customer.trial_ends_at) < new Date()
  ) {
    return {
      blocked: true,
      reason: "trial_expired",
      message:
        "Your 14-day FarmClaw trial has ended. Subscribe at https://app.farmclaw.com/settings/billing to keep your AI team running.",
    };
  }

  return { blocked: false };
}
