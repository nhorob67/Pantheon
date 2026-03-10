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
        <div className="quote-text">Every farmer I know is running a million-dollar operation while being everyone&apos;s help desk.</div>
        <div className="quote-sub">Your seed rep needs an answer on trait packages. Your operator has a question about the planter. The elevator is calling about storage contracts. Your crop insurance agent needs acreage numbers by Friday. And you&apos;re trying to make a $200K marketing decision while all of this lands on your phone.</div>
        <div className="quote-sub">After 20 years working with farmers, first as a consultant, then building Harvest Profit (acquired by John Deere in 2020), I realized the daily grind of routing information wears you down just as much as the big decisions. Every farmer I&apos;ve worked with is running a sophisticated operation out of text threads, sticky notes, and a patchwork of apps that don&apos;t talk to each other.</div>
        <div className="quote-sub">FarmClaw gives your farm AI assistants that know your operation, track your tasks and communication, watch your grain bids and weather windows, and keep everything organized in one place. So you can stop being the middleman for every question and start running your operation.</div>
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
