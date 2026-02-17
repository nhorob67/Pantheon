"use client";

import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  const id = label ? `switch-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined;

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
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          checked ? "bg-primary" : "bg-muted",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-[2px]",
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
