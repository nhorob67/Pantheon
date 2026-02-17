import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

/**
 * Returns a generic error message in production, real message in dev.
 * Always logs the real error.
 */
export function safeErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  const realMessage =
    error instanceof Error ? error.message : String(error);
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
