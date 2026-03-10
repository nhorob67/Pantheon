"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, m, LazyMotion, domAnimation } from "motion/react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const links = [
    { href: "#skills", label: "What It Does" },
    { href: "#how", label: "How It Works" },
    { href: "#trust", label: "Your Data" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <>
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <Link href="#" className="nav-logo">Farm<span>Claw</span></Link>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          <Link href="/signup" className="nav-cta">Get Started</Link>
        </div>
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          style={{ display: "none" }}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {menuOpen && (
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[101] bg-[var(--bg-deep)]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
          >
            <button
              onClick={closeMenu}
              className="absolute top-5 right-5 text-[var(--cream)] hover:text-[var(--accent)] transition-colors"
              aria-label="Close menu"
            >
              <X className="w-7 h-7" />
            </button>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeMenu}
                className="text-lg py-4 text-[var(--cream)] hover:text-[var(--accent)] transition-colors font-medium"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/signup"
              onClick={closeMenu}
              className="mt-4 btn-primary"
            >
              Get Started
            </Link>
          </m.div>
        )}
      </AnimatePresence>
      </LazyMotion>
    </>
  );
}
