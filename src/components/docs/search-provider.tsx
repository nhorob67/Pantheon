"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";
import { SearchModal } from "./search-modal";
import { createClient } from "@/lib/supabase/client";

interface SearchState {
  isOpen: boolean;
  canAskAi: boolean;
  authChecked: boolean;
}

interface SearchActions {
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
}

interface SearchContextValue {
  state: SearchState;
  actions: SearchActions;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const context = use(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a <SearchProvider>");
  }

  return context;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [canAskAi, setCanAskAi] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);
  const toggleSearch = useCallback(() => setIsOpen((previous) => !previous), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleSearch();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSearch]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        setCanAskAi(Boolean(data.user));
        setAuthChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setCanAskAi(false);
        setAuthChecked(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setCanAskAi(Boolean(session?.user));
      setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SearchContext
      value={{
        state: {
          isOpen,
          canAskAi,
          authChecked,
        },
        actions: {
          openSearch,
          closeSearch,
          toggleSearch,
        },
      }}
    >
      {children}
      {isOpen && <SearchModal />}
    </SearchContext>
  );
}
