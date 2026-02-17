"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#0f1209",
          color: "#f0ece4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#a8a392",
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Please try again or contact support if
            the problem persists.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#D98C2E",
              color: "#0f1209",
              border: "none",
              borderRadius: 9999,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
