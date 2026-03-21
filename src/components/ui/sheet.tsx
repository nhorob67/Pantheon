"use client";

import React, {
  useEffect,
  useCallback,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useModalA11y } from "@/components/ui/use-modal-a11y";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: "left" | "right";
  ariaLabel: string;
  panelClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

function Sheet({
  open,
  onClose,
  children,
  side = "left",
  ariaLabel,
  panelClassName = "",
  initialFocusRef,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { trapTabKey } = useModalA11y({
    dialogRef: panelRef,
    initialFocusRef,
    open,
  });

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

  const translateClass = "translate-x-0";
  const originClass = side === "left" ? "left-0" : "right-0";
  const borderClass = side === "left" ? "border-r" : "border-l";

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    trapTabKey(event);
  };

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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handlePanelKeyDown}
        className={`fixed top-0 ${originClass} h-full w-72 bg-bg-card ${borderClass} border-border shadow-xl ${translateClass} animate-slide-in-right overflow-y-auto ${panelClassName}`}
        style={
          side === "left"
            ? { animation: "slide-in-left 0.2s ease-out" }
            : undefined
        }
      >
        <h2 id={titleId} className="sr-only">
          {ariaLabel}
        </h2>
        {children}
      </div>
    </div>
  );
}

export { Sheet, type SheetProps };
