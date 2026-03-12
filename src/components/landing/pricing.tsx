import Link from "next/link";

export function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="section-label">Simple Pricing</div>
      <h2 className="section-title-display mx-auto">The cheapest hires on your team.</h2>

      <div className="pricing-card">
        <div className="pricing-trial-label">Try it free for 14 days</div>
        <div className="pricing-amount">$50</div>
        <div className="pricing-per-month">/month after trial</div>
        <div className="pricing-desc">No credit card to start. Cancel anytime.</div>
        <div className="pricing-divider" />

        <div className="pricing-usage-note">
          <p>
            <strong>Most teams pay $50.</strong> Your plan includes $25 of AI
            usage, enough for daily briefings, task management, and regular questions.
          </p>
          <p>
            Go beyond that and overage is billed in $20 blocks at month-end.
            That rate includes a small service fee that covers the infrastructure
            keeping your assistant available 24/7. Most heavy users (multiple
            agents, frequent research) land around $60&ndash;75/mo.
          </p>
          <div className="pricing-control-note">
            <span className="pricing-diamond" aria-hidden="true">&#x25C6;</span>
            <span>
              <strong>You set the limit.</strong> Add a spending cap in your
              dashboard. Your assistant pauses if you hit it. No surprise
              charges, ever.
            </span>
          </div>
        </div>

        <Link href="/signup" className="cta-inscription pricing-cta">Start Free Trial</Link>
        <p className="pricing-no-cc">No credit card required</p>
      </div>

      <div className="pricing-value-note">
        <strong>Think about it this way:</strong> One missed client follow-up.
        One forgotten contract renewal. One procedure a new hire didn&apos;t know about.
        Any one of these costs more than a full year of Pantheon. Your pantheon keeps track so
        nothing falls through the cracks.
      </div>
    </section>
  );
}
