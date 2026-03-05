export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border-light)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "var(--text-primary)",
} as const;

export const CHART_AXIS_TICK = {
  fontSize: 12,
  fill: "var(--text-dim)",
} as const;

export const CHART_AXIS_TICK_SMALL = { fontSize: 11 } as const;

export const CHART_COLORS = {
  green: "var(--green-bright)",
  amber: "var(--accent)",
  red: "var(--color-destructive, #b24c3f)",
  blue: "var(--color-chart-4, #5a7394)",
} as const;

export const formatCostTooltip = (value: number | string | undefined) =>
  [`$${Number(value ?? 0).toFixed(2)}`, "Cost"] as const;
