"use client";

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hasAttribute("disabled"))
    .filter((element) => element.getAttribute("aria-hidden") !== "true");
}

interface UseModalA11yOptions {
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
}

export function useModalA11y({
  dialogRef,
  initialFocusRef,
}: UseModalA11yOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frameId = requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frameId);
      previousFocusRef.current?.focus();
    };
  }, [initialFocusRef]);

  const trapTabKey = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return false;

    const dialog = dialogRef.current;
    if (!dialog) return false;

    const focusable = getFocusableElements(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      return true;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
      return true;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return true;
    }

    return false;
  };

  return { trapTabKey };
}
