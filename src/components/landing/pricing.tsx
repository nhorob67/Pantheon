import Link from "next/link";
import { Check, Shield } from "lucide-react";

const features = [
  "AI team configured for your operation",
  "$25/mo AI usage included — most farms stay under",
  "Discord for your crew — unlimited users",
  "Daily grain bids from your elevators",
  "Morning weather & spray briefings",
  "Scale ticket logging (photo/voice/typed)",
  "Research & analysis on demand",
  "Farm-specific memory that improves",
  "New capabilities added automatically",
  "Export data anytime — CSV or JSON",
  "Cancel anytime, no contracts",
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
        <div className="pricing-amount">$50</div>
        <div className="pricing-per-month">/month</div>
        <div className="pricing-desc">$1.67 a day for an assistant that never calls in sick.</div>
        <div className="pricing-divider" />
        <ul className="pricing-features">
          {features.map((feature) => (
            <li key={feature}><span className="check"><Check size={16} /></span> {feature}</li>
          ))}
        </ul>

        <div className="pricing-usage-note">
          <p>
            <strong>Most farmers pay $50.</strong> Your plan includes $25 of AI
            usage — enough for daily briefings, grain bids, and regular questions.
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

        <Link href="/signup" className="btn-primary pricing-cta">Get Started</Link>
      </div>

      <div className="pricing-value-note">
        <strong>Think about it this way:</strong> One better marketing decision — catching a basis move,
        timing a sale right — pays for a full year. Your assistant watches the markets every single day
        so you don&apos;t have to.
      </div>
    </section>
  );
}
