import type { CustomerSpendingAlert } from "@/lib/queries/admin-analytics";
import { formatCents } from "@/lib/utils/format";

interface SpendingAlertsPanelProps {
  alerts: CustomerSpendingAlert[];
}

export function SpendingAlertsPanel({ alerts }: SpendingAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">
          Spending Alerts
        </h3>
        <p className="text-sm text-foreground/50">
          No customers approaching spending limits.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
        Spending Alerts ({alerts.length})
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground/50 border-b border-border">
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Current</th>
              <th className="pb-2 font-medium">Cap</th>
              <th className="pb-2 font-medium">%</th>
              <th className="pb-2 font-medium">Auto-Pause</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr
                key={alert.customer_id}
                className="border-b border-border last:border-0"
              >
                <td className="py-2 font-mono text-xs">
                  {alert.email || alert.customer_id.slice(0, 8)}
                </td>
                <td className="py-2">{formatCents(alert.current_cents)}</td>
                <td className="py-2">
                  {formatCents(alert.spending_cap_cents)}
                </td>
                <td className="py-2">
                  <span
                    className={`font-semibold ${
                      alert.percentage >= 100
                        ? "text-destructive"
                        : alert.percentage >= 80
                          ? "text-amber-600"
                          : "text-foreground"
                    }`}
                  >
                    {alert.percentage}%
                  </span>
                </td>
                <td className="py-2">
                  {alert.auto_pause ? (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                      Yes
                    </span>
                  ) : (
                    <span className="text-xs text-foreground/40">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
