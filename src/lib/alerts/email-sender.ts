import { formatCents } from "@/lib/utils/format";

export async function sendAlertEmail(
  to: string,
  alert: { title: string; message: string; severity: string },
  currentCents: number,
  capCents: number
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const percentage = Math.round((currentCents / capCents) * 100);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
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
      `,
    }),
  });

  return res.ok;
}
