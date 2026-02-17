"use client";

import React, { useEffect, useCallback, type ReactNode } from "react";

type DialogSize = "sm" | "md" | "lg";

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: DialogSize;
  children: ReactNode;
}

function Dialog({ open, onClose, title, size = "md", children }: DialogProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 mt-24 w-full ${sizeClasses[size]} max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-xl animate-in fade-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="font-headline text-lg font-semibold text-foreground">
              {title}
            </h2>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex items-center justify-center rounded-full p-1.5 text-foreground/40 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        {children}
      </div>
    </div>
  );
}

export { Dialog, type DialogProps, type DialogSize };
