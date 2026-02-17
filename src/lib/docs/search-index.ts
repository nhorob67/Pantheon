export interface SearchIndexEntry {
  slug: string;
  title: string;
  section: string;
  headings: { id: string; title: string }[];
  body: string;
}

let searchIndexPromise: Promise<SearchIndexEntry[]> | null = null;

export async function getSearchIndex(
  fetchFn: typeof fetch = fetch
): Promise<SearchIndexEntry[]> {
  if (!searchIndexPromise) {
    searchIndexPromise = fetchFn("/search-index.json", {
      cache: "force-cache",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load search index: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          return [];
        }

        return data as SearchIndexEntry[];
      })
      .catch((error) => {
        searchIndexPromise = null;
        throw error;
      });
  }

  return searchIndexPromise;
}

export function resetSearchIndexCacheForTests() {
  searchIndexPromise = null;
}
