import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

/**
 * Returns a generic error message in production, real message in dev.
 * Always logs the real error.
 */
export function safeErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  const realMessage = extractErrorMessage(error);
  console.error("[ERROR]", realMessage);
  return isDev ? realMessage : fallback;
}

/**
 * Convenience wrapper returning a NextResponse with a safe error message.
 */
export function safeErrorResponse(
  error: unknown,
  fallback = "An unexpected error occurred",
  status = 500
): NextResponse {
  return NextResponse.json(
    { error: safeErrorMessage(error, fallback) },
    { status }
  );
}
