import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";

export const checkTrialExpiration = schedules.task({
  id: "check-trial-expiration",
  cron: "0 */2 * * *",
  retry: {
    maxAttempts: 2,
  },
  run: async () => {
    const admin = createTriggerAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Expire trials that have ended
    const { data: expiredTrials, error: expireError } = await admin
      .from("customers")
      .update({ subscription_status: "expired" })
      .eq("subscription_status", "trialing")
      .lt("trial_ends_at", nowIso)
      .select("id, email");

    if (expireError) {
      console.error("[check-trial-expiration] Failed to expire trials:", expireError.message);
    }

    const expired = expiredTrials?.length ?? 0;

    // 2. Day 10 reminder (4 days left): trial_ends_at between 3.5 and 4.5 days from now
    const day10Start = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000).toISOString();
    const day10End = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: day10Trials } = await admin
      .from("customers")
      .select("id, email")
      .eq("subscription_status", "trialing")
      .gte("trial_ends_at", day10Start)
      .lt("trial_ends_at", day10End);

    let reminders = 0;

    for (const customer of day10Trials || []) {
      const alertKey = `trial_reminder_day10:${customer.id}`;
      const { error } = await admin.from("alert_events").insert({
        customer_id: customer.id,
        alert_type: "trial_reminder",
        alert_key: alertKey,
        severity: "info",
        title: "Your FarmClaw trial ends in 4 days",
        message:
          "You've been using FarmClaw for 10 days. Your trial ends soon — subscribe to keep your assistant running. $50/month, includes $25 in AI usage.",
        metadata: { reminder: "day10" },
        delivery_channels: ["email", "dashboard"],
      });

      if (!error) {
        reminders++;
        await sendTrialReminderEmail(customer.email, "day10");
      }
      // 23505 = duplicate key — already sent, skip
    }

    // 3. Day 13 reminder (1 day left): trial_ends_at between 0.5 and 1.5 days from now
    const day13Start = new Date(now.getTime() + 0.5 * 24 * 60 * 60 * 1000).toISOString();
    const day13End = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: day13Trials } = await admin
      .from("customers")
      .select("id, email")
      .eq("subscription_status", "trialing")
      .gte("trial_ends_at", day13Start)
      .lt("trial_ends_at", day13End);

    for (const customer of day13Trials || []) {
      const alertKey = `trial_reminder_day13:${customer.id}`;
      const { error } = await admin.from("alert_events").insert({
        customer_id: customer.id,
        alert_type: "trial_reminder",
        alert_key: alertKey,
        severity: "warning",
        title: "Last day: Your FarmClaw trial ends tomorrow",
        message:
          "After tomorrow, your AI team goes offline. Your farm data and settings stay safe — subscribe anytime to pick up right where you left off.",
        metadata: { reminder: "day13" },
        delivery_channels: ["email", "dashboard"],
      });

      if (!error) {
        reminders++;
        await sendTrialReminderEmail(customer.email, "day13");
      }
    }

    return { expired, reminders };
  },
});

async function sendTrialReminderEmail(
  to: string,
  stage: "day10" | "day13"
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.farmclaw.com";

  const subject =
    stage === "day10"
      ? "Your FarmClaw trial ends in 4 days"
      : "Last day: Your FarmClaw trial ends tomorrow";

  const body =
    stage === "day10"
      ? `<div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #d97706;">Your FarmClaw trial ends in 4 days</h2>
          <p>You've been using FarmClaw for 10 days. Your trial ends soon.</p>
          <p>Subscribe to keep your AI team running — $50/month, includes $25 in AI usage.</p>
          <p style="margin-top: 24px;">
            <a href="${appUrl}/settings/billing" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: 600;">Subscribe Now</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            $1.67/day for an AI team that never calls in sick. Cancel anytime.
          </p>
        </div>`
      : `<div style="font-family: sans-serif; max-width: 600px;">
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
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "FarmClaw <hello@farmclaw.com>",
      to: [to],
      subject: `[FarmClaw] ${subject}`,
      html: body,
    }),
  }).catch((err) => {
    console.error("[check-trial-expiration] Failed to send reminder email:", err);
  });
}
