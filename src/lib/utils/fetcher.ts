/**
 * Shared SWR fetcher — JSON GET with error handling.
 */
export const jsonFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }
  return res.json();
};
