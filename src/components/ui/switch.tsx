"use client";

import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Override the checked-state track color (default: "bg-primary") */
  checkedColorClass?: string;
}

const SIZE_CLASSES = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-3.5 w-3.5",
    on: "translate-x-[18px]",
    off: "translate-x-[2px]",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-5 w-5",
    on: "translate-x-[22px]",
    off: "translate-x-[2px]",
  },
} as const;

function Switch({ checked, onChange, label, disabled = false, size = "md", checkedColorClass = "bg-primary" }: SwitchProps) {
  const id = label ? `switch-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined;
  const s = SIZE_CLASSES[size];

  return (
    <div className="inline-flex items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          `relative inline-flex ${s.track} shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer`,
          "disabled:opacity-50 disabled:cursor-not-allowed",
          checked ? checkedColorClass : "bg-muted",
        ].join(" ")}
      >
        <span
          className={[
            `inline-block ${s.thumb} rounded-full bg-white shadow-sm transition-transform duration-200`,
            checked ? s.on : s.off,
          ].join(" ")}
        />
      </button>

      {label && (
        <label
          htmlFor={id}
          className={[
            "font-body text-sm select-none",
            disabled ? "text-foreground/40 cursor-not-allowed" : "text-foreground cursor-pointer",
          ].join(" ")}
        >
          {label}
        </label>
      )}
    </div>
  );
}

export { Switch, type SwitchProps };
