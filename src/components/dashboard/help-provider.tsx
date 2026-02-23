"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";
import { HelpModal } from "./help-modal";

interface HelpState {
  isOpen: boolean;
}

interface HelpActions {
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

interface HelpContextValue {
  state: HelpState;
  actions: HelpActions;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function useHelp() {
  const context = use(HelpContext);
  if (!context) {
    throw new Error("useHelp must be used within a <HelpProvider>");
  }

  return context;
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openHelp = useCallback(() => setIsOpen(true), []);
  const closeHelp = useCallback(() => setIsOpen(false), []);
  const toggleHelp = useCallback(() => setIsOpen((previous) => !previous), []);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;

      const tagName = target.tagName;
      return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
    };

    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || isEditableTarget(e.target)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        toggleHelp();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleHelp]);

  return (
    <HelpContext
      value={{
        state: { isOpen },
        actions: { openHelp, closeHelp, toggleHelp },
      }}
    >
      {children}
      {isOpen && <HelpModal />}
    </HelpContext>
  );
}
