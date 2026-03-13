"use client";

import { AnimatedSection } from "./animated-section";

export function CommandersLog() {
  return (
    <AnimatedSection>
      <div className="v2-commanders-log">
        <div className="v2-log-header">
          <span className="v2-log-label">Transmission // Architect-001</span>
          <span className="v2-log-label">Classified</span>
        </div>

        <div className="v2-log-body">
          <div className="v2-log-section">
            <div className="v2-log-section-label">Situation</div>
            <p className="v2-log-section-text">
              Every operation I have studied runs the same way: critical intelligence scattered across text threads,
              email chains, and sticky notes. Decision history lives in one person&apos;s head. Follow-ups fall through
              the cracks not because people are careless, but because no single mind can track everything.
            </p>
          </div>

          <div className="v2-log-section">
            <div className="v2-log-section-label">Assessment</div>
            <p className="v2-log-section-text">
              The best-run operations I have studied share a common structure: no single person handles everything.
              They build teams of specialists — each owns a domain, each carries a clear mandate,
              each is accountable to the whole. One mind for strategy, another for communications,
              another for process enforcement.
            </p>
          </div>

          <div className="v2-log-section">
            <div className="v2-log-section-label">Recommendation</div>
            <p className="v2-log-section-text">
              Not one AI that pretends to do everything. A team of specialists you define — each with a role,
              a goal, and a backstory you write. Working together inside Discord — where your team already lives, with channels,
              threads, mobile notifications, and search already built. No new interface to learn, no tab to
              forget. That is Pantheon.
            </p>
          </div>

          <div className="v2-log-signoff">
            Nick Horob — Architect — Fargo, ND
          </div>
        </div>

        <div className="v2-log-stamp">Pantheon Approved</div>
      </div>
    </AnimatedSection>
  );
}
