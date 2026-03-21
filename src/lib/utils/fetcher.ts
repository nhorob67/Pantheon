/**
 * Shared SWR fetcher — JSON GET with error handling.
 */
interface TenantEnvelope<T> {
  version: string;
  request_id: string;
  idempotency_key: string | null;
  idempotency_replayed: boolean;
  data: T;
  error: { message?: string } | string | null;
}

function isTenantEnvelope<T>(value: unknown): value is TenantEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    "request_id" in value &&
    "data" in value &&
    "error" in value
  );
}

export const jsonFetcher = async (url: string) => {
  const res = await fetch(url);
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (isTenantEnvelope(payload)) {
      const errorMessage =
        typeof payload.error === "string"
          ? payload.error
          : payload.error?.message;
      throw new Error(errorMessage || `Request failed (${res.status})`);
    }

    const message =
      typeof payload?.error === "string"
        ? payload.error
        : payload?.error?.message;
    throw new Error(message || `Request failed (${res.status})`);
  }

  if (isTenantEnvelope(payload)) {
    return payload.data;
  }

  return payload;
};
