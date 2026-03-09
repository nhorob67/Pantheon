"use client";

import Link from "next/link";
import { m, LazyMotion, domAnimation } from "motion/react";
import { Shield } from "lucide-react";

export function SocialProof() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="quote-section"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div className="section-label">Who Built This</div>
        <div className="quote-text">Built by a farmer&apos;s kid who watched things fall through the cracks every season.</div>
        <div className="quote-sub">FarmClaw is built in Fargo, ND by a team that grew up on Upper Midwest row crop operations. We built this because we watched our families juggle to-do lists on whiteboards, procedures that lived in someone&apos;s head, elevator websites, and weather apps — every single day — just to keep the operation running. One conversation should handle all of it.</div>
        <div className="quote-attr">NICK HOROB &middot; Fargo, ND</div>
        <div className="quote-guarantee">
          <Shield size={18} />
          If it doesn&apos;t save you time, cancel anytime. No questions.
        </div>
        <div style={{ marginTop: 32 }}>
          <Link href="/signup" className="btn-primary">Get Started</Link>
        </div>
      </m.section>
    </LazyMotion>
  );
}
