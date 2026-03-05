"use client";

import React, { useEffect, useCallback, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: "left" | "right";
}

function Sheet({ open, onClose, children, side = "left" }: SheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const translateClass =
    side === "left" ? "translate-x-0" : "translate-x-0";
  const originClass =
    side === "left" ? "left-0" : "right-0";

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 ${originClass} h-full w-72 bg-bg-card border-r border-border shadow-xl ${translateClass} animate-slide-in-right overflow-y-auto`}
        style={
          side === "left"
            ? { animation: "slide-in-left 0.2s ease-out" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

export { Sheet, type SheetProps };
