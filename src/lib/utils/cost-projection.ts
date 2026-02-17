export interface CostProjection {
  projected: number;
  low: number;
  high: number;
}

export function projectMonthlyCost(
  currentCents: number,
  daysElapsed: number,
  daysInMonth: number,
  dailyCosts: number[]
): CostProjection {
  if (daysElapsed <= 0 || daysInMonth <= 0) {
    return { projected: currentCents, low: currentCents, high: currentCents };
  }

  const dailyAvg = currentCents / daysElapsed;
  const remaining = daysInMonth - daysElapsed;
  const projected = Math.round(currentCents + dailyAvg * remaining);

  if (dailyCosts.length < 2) {
    return { projected, low: projected, high: projected };
  }

  const mean = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
  const variance =
    dailyCosts.reduce((sum, c) => sum + (c - mean) ** 2, 0) /
    dailyCosts.length;
  const stdDev = Math.sqrt(variance);

  const low = Math.max(
    currentCents,
    Math.round(currentCents + (dailyAvg - stdDev) * remaining)
  );
  const high = Math.round(currentCents + (dailyAvg + stdDev) * remaining);

  return { projected, low, high };
}
