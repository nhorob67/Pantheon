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
              The ancient civilizations understood something we forgot: no single deity governed everything.
              They built pantheons — councils of specialized powers, each sovereign over its own domain,
              each accountable to the whole. One mind for strategy, another for communications,
              another for the forge.
            </p>
          </div>

          <div className="v2-log-section">
            <div className="v2-log-section-label">Recommendation</div>
            <p className="v2-log-section-text">
              Not one AI that pretends to do everything. A council of them. Each with a mandate, a domain,
              and a directive. Working together inside Discord — where your team already lives, with channels,
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
