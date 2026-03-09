"use client";

import Link from "next/link";
import { m, LazyMotion, domAnimation } from "motion/react";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="final-cta"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <h2>Put your AI team<br /><em>to work.</em></h2>
        <p>Three minutes to set up. Your first task list and morning briefing hit Discord tomorrow.</p>
        <div className="final-cta-trust">14 days free &middot; No credit card &middot; Cancel in two clicks</div>
        <Link href="/signup" className="btn-primary">
          Start Your Free Trial <ArrowRight size={18} />
        </Link>
      </m.section>
    </LazyMotion>
  );
}
