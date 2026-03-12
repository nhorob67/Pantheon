"use client";

import { m, LazyMotion, domAnimation } from "motion/react";
import { REVEAL_SLOW } from "./motion-config";

interface AnimatedSectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedSection({ id, children, className }: AnimatedSectionProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className={`v2-section ${className ?? ""}`}
        id={id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <div className="v2-container">{children}</div>
      </m.section>
    </LazyMotion>
  );
}

interface SectionHeaderProps {
  label: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export function SectionHeader({ label, title, subtitle, centered }: SectionHeaderProps) {
  return (
    <div className="v2-section-header" style={centered ? { textAlign: "center" } : undefined}>
      <div className="v2-section-label">{label}</div>
      <h2 className="v2-section-title" style={centered ? { margin: "0 auto" } : undefined}>{title}</h2>
      {subtitle && <p className="v2-section-sub">{subtitle}</p>}
    </div>
  );
}
