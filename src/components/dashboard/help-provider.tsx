"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { HelpModal } from "./help-modal";

interface HelpContextValue {
  isOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextValue>({
  isOpen: false,
  openHelp: () => {},
  closeHelp: () => {},
});

export function useHelp() {
  return useContext(HelpContext);
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openHelp = useCallback(() => setIsOpen(true), []);
  const closeHelp = useCallback(() => setIsOpen(false), []);

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
        setIsOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <HelpContext value={{ isOpen, openHelp, closeHelp }}>
      {children}
      {isOpen && <HelpModal />}
    </HelpContext>
  );
}
