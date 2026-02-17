import React, { type HTMLAttributes } from "react";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0–100
}

function Progress({ value, className = "", ...rest }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`bg-muted rounded-full h-2 w-full overflow-hidden ${className}`}
      {...rest}
    >
      <div
        className="bg-energy rounded-full h-2 transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress, type ProgressProps };
