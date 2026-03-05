"use client";
import { useState, useCallback } from "react";

interface AsyncFormState {
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export function useAsyncFormState() {
  const [state, setState] = useState<AsyncFormState>({
    saving: false,
    saved: false,
    error: null,
  });

  const run = useCallback(async (fn: () => Promise<void>) => {
    setState({ saving: true, saved: false, error: null });
    try {
      await fn();
      setState({ saving: false, saved: true, error: null });
      setTimeout(() => setState((s) => (s.saved ? { ...s, saved: false } : s)), 3000);
    } catch (err) {
      setState({
        saving: false,
        saved: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { ...state, run, clearError };
}
