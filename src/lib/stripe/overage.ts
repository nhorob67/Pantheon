/** Monthly API credit included in subscription (cents) */
export const API_CREDIT_CENTS = 2500;

/** Margin applied to overage beyond credit */
export const OVERAGE_MARGIN = 0.25;

/** Overage billing block size (cents) — billed in $20 increments */
export const OVERAGE_BLOCK_CENTS = 2000;

export interface OverageResult {
  rawUsageCents: number;
  overageBaseCents: number;
  overageWithMarginCents: number;
  units: number;
  chargeableCents: number;
}

/**
 * Calculate overage billing for a customer's monthly API usage.
 *
 * Business logic:
 * 1. Subtract $25 API credit from raw usage
 * 2. Apply 25% margin to overage
 * 3. Round up to $20 billing blocks (ceil)
 *
 * Example: $60 raw → $35 overage → ceil($35 × 1.25) = $44 → ceil($44/$20) = 3 units → $60 charged
 */
export function calculateOverage(rawUsageCents: number): OverageResult {
  const overageBaseCents = Math.max(0, rawUsageCents - API_CREDIT_CENTS);
  const overageWithMarginCents = Math.ceil(
    overageBaseCents * (1 + OVERAGE_MARGIN)
  );
  const units =
    overageWithMarginCents > 0
      ? Math.ceil(overageWithMarginCents / OVERAGE_BLOCK_CENTS)
      : 0;

  return {
    rawUsageCents,
    overageBaseCents,
    overageWithMarginCents,
    units,
    chargeableCents: units * OVERAGE_BLOCK_CENTS,
  };
}
