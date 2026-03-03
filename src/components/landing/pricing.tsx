import Link from "next/link";

const features = [
  "AI assistant configured for your farm, always on",
  "Discord for your whole team — free, unlimited users",
  "Daily grain bids from your elevators",
  "Morning weather briefing at 6 AM",
  "Spray window analysis",
  "Scale ticket logging (photo, voice, or manual)",
  "Farm-specific memory that improves over time",
  "$25 of AI usage included each month",
  "Every update ships to your farm automatically",
  "Export your data anytime — CSV, JSON, your choice",
  "Cancel anytime, no contracts",
];

function UsageTransparency() {
  return (
    <div className="usage-transparency">
      <h3>How usage billing works</h3>
      <p>
        Your $50/month covers your farm&apos;s AI assistant, all skills and automations,
        and $25 of AI usage — enough for most farmers&apos; daily questions,
        weather checks, and grain bid lookups.
      </p>
      <p>
        If you go beyond that, overage is billed in $20 increments at the end of the month.
        Each message costs roughly a penny or two. There&apos;s no throttling — your
        assistant keeps working, and you see the exact usage in your dashboard.
      </p>
      <p>
        Most farmers who stick to daily briefings and a handful of questions land
        right around $50. Heavier users who run multiple agents or log scale
        tickets throughout the day typically see $60–75.
      </p>
    </div>
  );
}

export function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="section-label">Simple Pricing</div>
      <h2 className="section-title" style={{ margin: "0 auto" }}>The cheapest hire on your farm.</h2>

      <div className="pricing-card">
        <div className="pricing-amount">$50<span>/month</span></div>
        <div className="pricing-desc">$1.67 a day for an assistant that never calls in sick.</div>
        <div className="pricing-divider" />
        <ul className="pricing-features">
          {features.map((feature) => (
            <li key={feature}><span className="check">&#x2713;</span> {feature}</li>
          ))}
        </ul>
        <Link href="/signup" className="btn-primary pricing-cta">Start My Free Trial</Link>
      </div>

      <div className="pricing-value-note">
        <strong>Think about it this way:</strong> One better marketing decision — catching a basis move,
        timing a sale right — pays for a full year. Your assistant watches the markets every single day
        so you don&apos;t have to.
      </div>

      <UsageTransparency />
    </section>
  );
}
