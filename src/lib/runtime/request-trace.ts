import type { NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";
const CORRELATION_HEADER = "x-correlation-id";
const RUNTIME_CORRELATION_HEADER = "x-runtime-correlation-id";
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

function normalizeTraceValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_REQUEST_ID_LENGTH) {
    return null;
  }

  if (!REQUEST_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function resolveRequestTraceIdFromHeaders(headers: Pick<Headers, "get">): string {
  const explicitRequestId = normalizeTraceValue(headers.get(REQUEST_ID_HEADER));
  if (explicitRequestId) {
    return explicitRequestId;
  }

  const correlationId = normalizeTraceValue(headers.get(CORRELATION_HEADER));
  if (correlationId) {
    return correlationId;
  }

  const runtimeCorrelationId = normalizeTraceValue(headers.get(RUNTIME_CORRELATION_HEADER));
  if (runtimeCorrelationId) {
    return runtimeCorrelationId;
  }

  return crypto.randomUUID();
}

export function withRequestTraceHeader(
  response: NextResponse,
  requestTraceId: string
): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestTraceId);
  return response;
}
