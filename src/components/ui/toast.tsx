"use client";

import React, {
  createContext,
  use,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

const ToastContext = createContext<ToastContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Variant styles                                                            */
/* -------------------------------------------------------------------------- */

const variantClasses: Record<ToastVariant, string> = {
  success: "border-l-4 border-l-primary",
  error: "border-l-4 border-l-destructive",
  info: "border-l-4 border-l-intelligence",
};

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: (
    <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 text-destructive shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0120.66 21H3.34a1 1 0 01-.86-1.41L12 3z" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 text-intelligence shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Single toast item                                                         */
/* -------------------------------------------------------------------------- */

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), 5000);
    return () => clearTimeout(timer);
  }, [t.id, onDismiss]);

  return (
    <div
      className={[
        "flex items-center gap-3 bg-card rounded-xl shadow-lg px-4 py-3 min-w-[300px] max-w-sm",
        "animate-slide-in-right",
        variantClasses[t.variant],
      ].join(" ")}
      role="alert"
    >
      {variantIcons[t.variant]}
      <p className="font-body text-sm text-foreground flex-1">{t.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="text-foreground/40 hover:text-foreground transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — bottom-right */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>

    </ToastContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

function useToast(): ToastContextValue {
  const ctx = use(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

export { ToastProvider, useToast, type ToastVariant, type Toast };
