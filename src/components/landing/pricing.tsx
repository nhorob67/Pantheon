import Link from "next/link";
import { Check, Shield } from "lucide-react";

const features = [
  "AI team configured for your operation",
  "$25/mo AI usage included — most farms stay under",
  "Discord for your crew — unlimited users",
  "Daily task lists and reminders",
  "SOPs and procedure checklists",
  "Morning weather & spray briefings",
  "Grain bids from your elevators",
  "Scale ticket logging (photo/voice/typed)",
  "Research & analysis on demand",
  "Farm-specific memory that improves",
  "New capabilities added automatically",
];

export function Pricing() {
  return (
    <section
      className="pricing-section"
      id="pricing"
    >
      <div className="section-label">Simple Pricing</div>
      <h2 className="section-title-display" style={{ margin: "0 auto" }}>The cheapest hire on your farm.</h2>

      <div className="pricing-card">
        <div className="pricing-trial-label">Try it free for 14 days</div>
        <div className="pricing-amount">$50</div>
        <div className="pricing-per-month">/month after trial</div>
        <div className="pricing-desc">No credit card to start. Cancel anytime.</div>
        <div className="pricing-divider" />
        <ul className="pricing-features">
          {features.map((feature) => (
            <li key={feature}><span className="check"><Check size={16} /></span> {feature}</li>
          ))}
        </ul>

        <div className="pricing-usage-note">
          <p>
            <strong>Most farmers pay $50.</strong> Your plan includes $25 of AI
            usage — enough for daily briefings, task management, and regular questions.
          </p>
          <p>
            Go beyond that and overage is billed in $20 blocks at month-end.
            That rate includes a small service fee that covers the infrastructure
            keeping your assistant available 24/7. Most heavy users (multiple
            agents, frequent scale tickets) land around $60–75/mo.
          </p>
          <div className="pricing-control-note">
            <Shield size={16} />
            <span>
              <strong>You set the limit.</strong> Add a spending cap in your
              dashboard — your assistant pauses if you hit it. No surprise
              charges, ever.
            </span>
          </div>
        </div>

        <Link href="/signup" className="btn-primary pricing-cta">Start 14-Day Free Trial</Link>
        <p className="text-center text-text-dim text-sm mt-2">No credit card required</p>
      </div>

      <div className="pricing-value-note">
        <strong>Think about it this way:</strong> One missed deadline, one forgotten procedure,
        one dropped ball during planting costs more than a full year of FarmClaw. Your AI team
        keeps track so nothing falls through the cracks.
      </div>
    </section>
  );
}
