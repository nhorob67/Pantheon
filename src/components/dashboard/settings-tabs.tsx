"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, useCallback } from "react";
import type { SettingsNavItem } from "@/lib/navigation/settings";

interface SettingsTabsProps {
  tabs: SettingsNavItem[];
}

export function SettingsTabs({ tabs }: SettingsTabsProps) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const hasEmailTab = tabs.some((tab) => tab.href === "/settings/email");
  const settingsTabs =
    pathname.startsWith("/settings/email") && !hasEmailTab
      ? [...tabs, { href: "/settings/email", label: "Email (Optional)" }]
      : tabs;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const active = activeRef.current;
      const offset = active.offsetLeft - container.offsetLeft;
      const scrollTo = offset - 16;
      container.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  }, [pathname]);

  return (
    <div className="relative mb-8">
      {/* Left fade mask */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200"
        style={{
          background: "linear-gradient(to right, var(--bg-deep), transparent)",
          opacity: canScrollLeft ? 1 : 0,
        }}
      />

      {/* Right fade mask */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200"
        style={{
          background: "linear-gradient(to left, var(--bg-deep), transparent)",
          opacity: canScrollRight ? 1 : 0,
        }}
      />

      {/* Scrollable tab strip */}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-border-light"
        style={{ scrollbarWidth: "none" }}
      >
        {settingsTabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              ref={active ? activeRef : undefined}
              href={tab.href}
              className={`relative shrink-0 px-3 pb-2.5 pt-1 text-[13px] tracking-wide transition-colors whitespace-nowrap ${
                active
                  ? "text-accent-light font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
