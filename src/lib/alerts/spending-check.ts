import { createAdminClient } from "@/lib/supabase/admin";
import { sendAlertEmail } from "./email-sender";
import { formatCents } from "@/lib/utils/format";
import {
  SPENDING_ANOMALY_MULTIPLIER,
  SPENDING_THRESHOLDS,
} from "@/lib/utils/constants";

interface CheckResult {
  checked: number;
  alerts_created: number;
  paused: number;
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function checkAllCustomerSpending(): Promise<CheckResult> {
  const admin = createAdminClient();
  const result: CheckResult = { checked: 0, alerts_created: 0, paused: 0 };

  // Get all customers with spending caps
  const { data: customers } = await admin
    .from("customers")
    .select(
      "id, email, spending_cap_cents, spending_cap_auto_pause, alert_email"
    )
    .not("spending_cap_cents", "is", null);

  if (!customers || customers.length === 0) return result;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const daysElapsed = new Date().getDate();
  const { data: monthlySpendingRows, error: monthlySpendingError } = await admin
    .rpc("customer_monthly_spending_snapshot", {
      p_start_date: startOfMonthStr,
      p_today: today,
    });

  if (monthlySpendingError) throw new Error(monthlySpendingError.message);

  const spendingByCustomer = new Map<
    string,
    { total_cost_cents: number; today_cost_cents: number }
  >();
  for (const row of (monthlySpendingRows || []) as Array<{
    customer_id: string;
    total_cost_cents: unknown;
    today_cost_cents: unknown;
  }>) {
    spendingByCustomer.set(row.customer_id, {
      total_cost_cents: toSafeNumber(row.total_cost_cents),
      today_cost_cents: toSafeNumber(row.today_cost_cents),
    });
  }

  for (const customer of customers) {
    result.checked++;
    const capCents = customer.spending_cap_cents!;

    const spending = spendingByCustomer.get(customer.id);
    const totalCostCents = spending?.total_cost_cents || 0;

    const percentage = Math.round((totalCostCents / capCents) * 100);

    // Check thresholds (50%, 80%, 100%)
    for (const threshold of SPENDING_THRESHOLDS) {
      if (percentage < threshold) continue;

      const severity =
        threshold >= 100 ? "critical" : threshold >= 80 ? "warning" : "info";
      const alertKey = `spending_${threshold}:${currentMonth}`;

      const alert = {
        customer_id: customer.id,
        alert_type: "spending_threshold" as const,
        alert_key: alertKey,
        severity,
        title: `Spending at ${percentage}% of monthly cap`,
        message: `Your API usage (${formatCents(totalCostCents)}) has reached ${percentage}% of your ${formatCents(capCents)} monthly cap.`,
        metadata: {
          threshold,
          current_cents: totalCostCents,
          cap_cents: capCents,
          percentage,
        },
        delivery_channels: ["dashboard"],
      };

      // Insert with dedup (unique index prevents duplicates)
      const { error } = await admin.from("alert_events").insert(alert);

      if (!error) {
        result.alerts_created++;

        // Send email if configured
        const alertEmailAddr = customer.alert_email || customer.email;
        if (alertEmailAddr && threshold >= 80) {
          await sendAlertEmail(alertEmailAddr, alert, totalCostCents, capCents);
        }
      }
      // 23505 = duplicate key — alert already exists, skip
    }

    // Anomaly detection: today's cost > 3x daily average
    if (daysElapsed > 1) {
      const todayCost = spending?.today_cost_cents || 0;
      const dailyAvg = totalCostCents / daysElapsed;

      if (todayCost > dailyAvg * SPENDING_ANOMALY_MULTIPLIER && todayCost > 50) {
        const anomalyKey = `spending_anomaly:${today}`;
        const { error } = await admin.from("alert_events").insert({
          customer_id: customer.id,
          alert_type: "spending_anomaly",
          alert_key: anomalyKey,
          severity: "warning",
          title: "Unusual spending detected",
          message: `Today's API cost (${formatCents(todayCost)}) is ${Math.round(todayCost / dailyAvg)}x your daily average.`,
          metadata: { today_cost: todayCost, daily_avg: Math.round(dailyAvg) },
          delivery_channels: ["dashboard"],
        });
        if (!error) result.alerts_created++;
      }
    }

    // Circuit breaker: pause tenant AI processing when cap exceeded
    if (percentage >= 100 && customer.spending_cap_auto_pause) {
      const { error: pauseError } = await admin
        .from("customers")
        .update({ spending_paused_at: new Date().toISOString() })
        .eq("id", customer.id)
        .is("spending_paused_at", null);

      if (!pauseError) {
        result.paused++;

        const alertEmailAddr = customer.alert_email || customer.email;
        if (alertEmailAddr) {
          await sendAlertEmail(
            alertEmailAddr,
            {
              title: "AI assistant paused — spending cap reached",
              message: `Your API usage (${formatCents(totalCostCents)}) has exceeded your ${formatCents(capCents)} monthly cap. Your assistant has been paused. Increase your cap in Settings to resume.`,
              severity: "critical",
            },
            totalCostCents,
            capCents
          );
        }
      }
    }
  }

  return result;
}
