import assert from "node:assert/strict";
import test from "node:test";
import { REQUEST_ID_HEADER, resolveRequestTraceIdFromHeaders } from "./request-trace.ts";

test("resolveRequestTraceIdFromHeaders prefers explicit request id", () => {
  const headers = new Headers();
  headers.set(REQUEST_ID_HEADER, "req-123");
  headers.set("x-correlation-id", "corr-456");

  const requestTraceId = resolveRequestTraceIdFromHeaders(headers);
  assert.equal(requestTraceId, "req-123");
});

test("resolveRequestTraceIdFromHeaders falls back to correlation headers", () => {
  const headers = new Headers();
  headers.set("x-correlation-id", "corr-456");

  const requestTraceId = resolveRequestTraceIdFromHeaders(headers);
  assert.equal(requestTraceId, "corr-456");
});

test("resolveRequestTraceIdFromHeaders rejects invalid ids and generates uuid", () => {
  const headers = new Headers();
  headers.set(REQUEST_ID_HEADER, "not valid!");

  const requestTraceId = resolveRequestTraceIdFromHeaders(headers);
  assert.match(requestTraceId, /^[0-9a-f-]{36}$/i);
});
