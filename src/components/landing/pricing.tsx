import Link from "next/link";
import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis } from "./deity-marks";
import type { DeityMarkProps } from "./deity-marks";

interface Formation {
  name: string;
  desc: string;
  marks: React.ComponentType<DeityMarkProps>[];
  features: string[];
}

const formations: Formation[] = [
  {
    name: "Vanguard",
    desc: "1\u20132 agents",
    marks: [Athena, Ares],
    features: [
      "Your pantheon, assembled for your operation",
      "$25/mo AI usage included, most teams stay under",
      "Discord for your team, unlimited users",
      "Task management and daily reminders",
      "Email intelligence and follow-up tracking",
      "SOPs and procedure checklists",
    ],
  },
  {
    name: "Council",
    desc: "3 agents",
    marks: [Athena, Hermes, Apollo],
    features: [
      "Everything in Vanguard",
      "Research and analysis on demand",
      "Document processing (PDF, DOCX, contracts)",
      "Communication tracking across contacts",
      "Work-specific memory that improves",
    ],
  },
  {
    name: "Full Pantheon",
    desc: "4+ agents",
    marks: [Athena, Hermes, Ares, Apollo, Hephaestus, Artemis],
    features: [
      "Everything in Council",
      "Scheduling and deadline tracking",
      "Custom skills and integrations",
      "Agent delegation and collaboration",
      "Priority support",
      "New capabilities added automatically",
    ],
  },
];

export function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="section-label">Simple Pricing</div>
      <h2 className="section-title-display mx-auto">The cheapest hire on your team.</h2>

      <div className="pricing-formations">
        {formations.map((f) => (
          <div key={f.name} className="pricing-formation-card">
            <div className="pricing-formation-marks">
              {f.marks.map((Mark, i) => (
                <Mark key={i} size={20} className="pricing-mark" />
              ))}
            </div>
            <h3 className="pricing-formation-name">{f.name}</h3>
            <div className="pricing-formation-desc">{f.desc}</div>
            <ul className="pricing-formation-features">
              {f.features.map((feat) => (
                <li key={feat}>
                  <span className="pricing-diamond" aria-hidden="true">&#x25C6;</span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

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
