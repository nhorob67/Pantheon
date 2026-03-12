"use client";

import { useState } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { useCommandBarScroll } from "@/hooks/use-landing-v2-animations";

export function CommandBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { progressRef, tickerRef } = useCommandBarScroll();

  return (
    <nav className="command-bar">
      <div className="command-bar-left">
        <span className="command-bar-status-dot" />
        <span className="command-bar-wordmark">Pantheon</span>
      </div>

      <div className="command-bar-center">
        <span className="command-bar-ticker" ref={tickerRef}>
          SYSTEM ONLINE // ALL AGENTS STANDING BY
        </span>
      </div>

      <div className="command-bar-right">
        <Link href="/login" className="command-bar-link">
          Log In
        </Link>
        <Link href="#pricing" className="command-bar-cta" style={{ display: "var(--desktop-display, inline-flex)" }}>
          Deploy Your Council
        </Link>
        <button
          className="command-bar-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="17" y2="6" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </>
            )}
          </svg>
        </button>
      </div>

      <div className="command-bar-progress" ref={progressRef} />

      <AnimatePresence>
        {mobileOpen && (
          <m.div
            className="v2-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Link href="#skills" onClick={() => setMobileOpen(false)}>Operations</Link>
            <Link href="#team" onClick={() => setMobileOpen(false)}>Registry</Link>
            <Link href="#how" onClick={() => setMobileOpen(false)}>Deployment</Link>
            <Link href="#pricing" onClick={() => setMobileOpen(false)}>Formations</Link>
            <Link href="/login" onClick={() => setMobileOpen(false)}>Log In</Link>
            <Link href="/signup" onClick={() => setMobileOpen(false)}>Deploy Your Council</Link>
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
