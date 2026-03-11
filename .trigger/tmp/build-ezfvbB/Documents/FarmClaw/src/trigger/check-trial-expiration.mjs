import {
  createClient,
  createTriggerAdminClient,
  dist_exports
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  schedules_exports
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/check-trial-expiration.ts
init_esm();

// src/lib/alerts/spending-check.ts
init_esm();

// src/lib/supabase/admin.ts
init_esm();
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
__name(createAdminClient, "createAdminClient");

// src/lib/alerts/email-sender.ts
init_esm();

// src/lib/utils/format.ts
init_esm();
function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
__name(formatCents, "formatCents");

// src/lib/alerts/email-sender.ts
async function sendAlertEmail(to, alert, currentCents, capCents) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const percentage = Math.round(currentCents / capCents * 100);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "FarmClaw Alerts <alerts@farmclaw.com>",
      to: [to],
      subject: `[FarmClaw] ${alert.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: ${alert.severity === "critical" ? "#dc2626" : "#d97706"};">${alert.title}</h2>
          <p>${alert.message}</p>
          <table style="margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 16px 4px 0; color: #666;">Current Spend:</td>
              <td style="font-weight: bold;">${formatCents(currentCents)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 16px 4px 0; color: #666;">Monthly Cap:</td>
              <td style="font-weight: bold;">${formatCents(capCents)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 16px 4px 0; color: #666;">Usage:</td>
              <td style="font-weight: bold;">${percentage}%</td>
            </tr>
          </table>
          <p style="margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/usage" style="background: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Usage Details</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Manage your spending cap in Settings &gt; Billing.
          </p>
        </div>
      `
    })
  });
  return res.ok;
}
__name(sendAlertEmail, "sendAlertEmail");

// src/lib/utils/constants.ts
init_esm();
var SPENDING_ANOMALY_MULTIPLIER = 3;
var SPENDING_THRESHOLDS = [50, 80, 100];

// src/lib/alerts/spending-check.ts
function toSafeNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
__name(toSafeNumber, "toSafeNumber");
async function checkAllCustomerSpending() {
  const admin = createAdminClient();
  const result = { checked: 0, alerts_created: 0, paused: 0 };
  const { data: customers } = await admin.from("customers").select(
    "id, email, spending_cap_cents, spending_cap_auto_pause, alert_email"
  ).not("spending_cap_cents", "is", null);
  if (!customers || customers.length === 0) return result;
  const startOfMonth = /* @__PURE__ */ new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const currentMonth = `${(/* @__PURE__ */ new Date()).getFullYear()}-${String((/* @__PURE__ */ new Date()).getMonth() + 1).padStart(2, "0")}`;
  const daysElapsed = (/* @__PURE__ */ new Date()).getDate();
  const { data: monthlySpendingRows, error: monthlySpendingError } = await admin.rpc("customer_monthly_spending_snapshot", {
    p_start_date: startOfMonthStr,
    p_today: today
  });
  if (monthlySpendingError) throw new Error(monthlySpendingError.message);
  const spendingByCustomer = /* @__PURE__ */ new Map();
  for (const row of monthlySpendingRows || []) {
    spendingByCustomer.set(row.customer_id, {
      total_cost_cents: toSafeNumber(row.total_cost_cents),
      today_cost_cents: toSafeNumber(row.today_cost_cents)
    });
  }
  for (const customer of customers) {
    result.checked++;
    const capCents = customer.spending_cap_cents;
    const spending = spendingByCustomer.get(customer.id);
    const totalCostCents = spending?.total_cost_cents || 0;
    const percentage = Math.round(totalCostCents / capCents * 100);
    for (const threshold of SPENDING_THRESHOLDS) {
      if (percentage < threshold) continue;
      const severity = threshold >= 100 ? "critical" : threshold >= 80 ? "warning" : "info";
      const alertKey = `spending_${threshold}:${currentMonth}`;
      const alert = {
        customer_id: customer.id,
        alert_type: "spending_threshold",
        alert_key: alertKey,
        severity,
        title: `Spending at ${percentage}% of monthly cap`,
        message: `Your API usage (${formatCents(totalCostCents)}) has reached ${percentage}% of your ${formatCents(capCents)} monthly cap.`,
        metadata: {
          threshold,
          current_cents: totalCostCents,
          cap_cents: capCents,
          percentage
        },
        delivery_channels: ["dashboard"]
      };
      const { error } = await admin.from("alert_events").insert(alert);
      if (!error) {
        result.alerts_created++;
        const alertEmailAddr = customer.alert_email || customer.email;
        if (alertEmailAddr && threshold >= 80) {
          await sendAlertEmail(alertEmailAddr, alert, totalCostCents, capCents);
        }
      }
    }
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
          delivery_channels: ["dashboard"]
        });
        if (!error) result.alerts_created++;
      }
    }
    if (percentage >= 100 && customer.spending_cap_auto_pause) {
      const { error: pauseError } = await admin.from("customers").update({ spending_paused_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", customer.id).is("spending_paused_at", null);
      if (!pauseError) {
        result.paused++;
        const alertEmailAddr = customer.alert_email || customer.email;
        if (alertEmailAddr) {
          await sendAlertEmail(
            alertEmailAddr,
            {
              title: "AI assistant paused — spending cap reached",
              message: `Your API usage (${formatCents(totalCostCents)}) has exceeded your ${formatCents(capCents)} monthly cap. Your assistant has been paused. Increase your cap in Settings to resume.`,
              severity: "critical"
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
__name(checkAllCustomerSpending, "checkAllCustomerSpending");

// src/trigger/check-trial-expiration.ts
var checkTrialAndSpending = schedules_exports.task({
  id: "check-trial-and-spending",
  cron: "0 */2 * * *",
  retry: {
    maxAttempts: 2
  },
  run: /* @__PURE__ */ __name(async () => {
    const admin = createTriggerAdminClient();
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    const { data: expiredTrials, error: expireError } = await admin.from("customers").update({ subscription_status: "expired" }).eq("subscription_status", "trialing").lt("trial_ends_at", nowIso).select("id, email");
    if (expireError) {
      console.error("[check-trial-expiration] Failed to expire trials:", expireError.message);
    }
    const expired = expiredTrials?.length ?? 0;
    const day10Start = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1e3).toISOString();
    const day10End = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1e3).toISOString();
    const { data: day10Trials } = await admin.from("customers").select("id, email").eq("subscription_status", "trialing").gte("trial_ends_at", day10Start).lt("trial_ends_at", day10End);
    let reminders = 0;
    for (const customer of day10Trials || []) {
      const alertKey = `trial_reminder_day10:${customer.id}`;
      const { error } = await admin.from("alert_events").insert({
        customer_id: customer.id,
        alert_type: "trial_reminder",
        alert_key: alertKey,
        severity: "info",
        title: "Your FarmClaw trial ends in 4 days",
        message: "You've been using FarmClaw for 10 days. Your trial ends soon — subscribe to keep your assistant running. $50/month, includes $25 in AI usage.",
        metadata: { reminder: "day10" },
        delivery_channels: ["email", "dashboard"]
      });
      if (!error) {
        reminders++;
        await sendTrialReminderEmail(customer.email, "day10");
      }
    }
    const day13Start = new Date(now.getTime() + 0.5 * 24 * 60 * 60 * 1e3).toISOString();
    const day13End = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1e3).toISOString();
    const { data: day13Trials } = await admin.from("customers").select("id, email").eq("subscription_status", "trialing").gte("trial_ends_at", day13Start).lt("trial_ends_at", day13End);
    for (const customer of day13Trials || []) {
      const alertKey = `trial_reminder_day13:${customer.id}`;
      const { error } = await admin.from("alert_events").insert({
        customer_id: customer.id,
        alert_type: "trial_reminder",
        alert_key: alertKey,
        severity: "warning",
        title: "Last day: Your FarmClaw trial ends tomorrow",
        message: "After tomorrow, your AI team goes offline. Your farm data and settings stay safe — subscribe anytime to pick up right where you left off.",
        metadata: { reminder: "day13" },
        delivery_channels: ["email", "dashboard"]
      });
      if (!error) {
        reminders++;
        await sendTrialReminderEmail(customer.email, "day13");
      }
    }
    let spendingResult = null;
    try {
      spendingResult = await checkAllCustomerSpending();
    } catch (err) {
      console.error("[check-trial-and-spending] Spending check failed:", err);
    }
    return { expired, reminders, spending: spendingResult };
  }, "run")
});
async function sendTrialReminderEmail(to, stage) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.farmclaw.com";
  const subject = stage === "day10" ? "Your FarmClaw trial ends in 4 days" : "Last day: Your FarmClaw trial ends tomorrow";
  const body = stage === "day10" ? `<div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #d97706;">Your FarmClaw trial ends in 4 days</h2>
          <p>You've been using FarmClaw for 10 days. Your trial ends soon.</p>
          <p>Subscribe to keep your AI team running — $50/month, includes $25 in AI usage.</p>
          <p style="margin-top: 24px;">
            <a href="${appUrl}/settings/billing" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: 600;">Subscribe Now</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            $1.67/day for an AI team that never calls in sick. Cancel anytime.
          </p>
        </div>` : `<div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #d97706;">Last day: Your FarmClaw trial ends tomorrow</h2>
          <p>After tomorrow, your AI team goes offline. Your farm data and settings stay safe — subscribe anytime to pick up right where you left off.</p>
          <p style="margin-top: 24px;">
            <a href="${appUrl}/settings/billing" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: 600;">Subscribe Now</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            $1.67/day. Includes $25 monthly AI credit. Cancel anytime.
          </p>
        </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "FarmClaw <hello@farmclaw.com>",
      to: [to],
      subject: `[FarmClaw] ${subject}`,
      html: body
    })
  }).catch((err) => {
    console.error("[check-trial-expiration] Failed to send reminder email:", err);
  });
}
__name(sendTrialReminderEmail, "sendTrialReminderEmail");
export {
  checkTrialAndSpending
};
//# sourceMappingURL=check-trial-expiration.mjs.map
