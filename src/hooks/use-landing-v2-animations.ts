"use client";

import { useState, useEffect, useRef } from "react";

export function useCountUp(
  end: number,
  options: { duration?: number; prefix?: string; suffix?: string } = {}
): { ref: React.RefObject<HTMLSpanElement | null>; value: string } {
  const { duration = 2000, prefix = "", suffix = "" } = options;
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(`${prefix}0${suffix}`);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          const start = performance.now();

          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * end);
            setValue(`${prefix}${current.toLocaleString()}${suffix}`);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, prefix, suffix]);

  return { ref, value };
}

const TICKER_MESSAGES = [
  { threshold: 0, text: "SYSTEM ONLINE // ALL AGENTS STANDING BY" },
  { threshold: 0.1, text: "AGENTS ONLINE // OPERATIONS ACTIVE" },
  { threshold: 0.3, text: "MISSION ACTIVE // DEPLOYING COUNCIL" },
  { threshold: 0.6, text: "FORMATIONS READY // AWAITING AUTHORIZATION" },
  { threshold: 0.85, text: "DEPLOYMENT AUTHORIZED // LAUNCH SEQUENCE READY" },
];

function getTickerMessage(progress: number): string {
  for (let i = TICKER_MESSAGES.length - 1; i >= 0; i--) {
    if (progress >= TICKER_MESSAGES[i].threshold) return TICKER_MESSAGES[i].text;
  }
  return TICKER_MESSAGES[0].text;
}

export function useCommandBarScroll(): {
  progressRef: React.RefObject<HTMLDivElement | null>;
  tickerRef: React.RefObject<HTMLSpanElement | null>;
} {
  const progressRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLSpanElement>(null);
  const lastTickerMsg = useRef("");

  useEffect(() => {
    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const progress = window.scrollY / scrollHeight;

      if (progressRef.current) {
        progressRef.current.style.width = `${progress * 100}%`;
      }

      const msg = getTickerMessage(progress);
      if (msg !== lastTickerMsg.current && tickerRef.current) {
        tickerRef.current.textContent = msg;
        lastTickerMsg.current = msg;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { progressRef, tickerRef };
}
