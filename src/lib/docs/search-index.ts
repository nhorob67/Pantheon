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
  flexSearchInstance = null;
  flexSearchImportPromise = null;
}

// --- FlexSearch integration (lazy-loaded) ---

type FlexSearchIndexType = import("flexsearch").Index;
let flexSearchImportPromise: Promise<typeof import("flexsearch")> | null = null;
let flexSearchInstance: FlexSearchIndexType | null = null;
let flexSearchEntries: SearchIndexEntry[] = [];

async function loadFlexSearch(): Promise<typeof import("flexsearch")> {
  if (!flexSearchImportPromise) {
    flexSearchImportPromise = import("flexsearch");
  }
  return flexSearchImportPromise;
}

/**
 * Build and return a FlexSearch index from the search entries.
 * Uses forward tokenization for prefix matching (e.g., "gran" matches "grain").
 * FlexSearch is dynamically imported on first call to keep it out of the initial bundle.
 */
export async function getFlexSearchIndex(entries: SearchIndexEntry[]): Promise<FlexSearchIndexType> {
  if (flexSearchInstance && flexSearchEntries === entries) {
    return flexSearchInstance;
  }

  const { Index: FlexSearchIndex } = await loadFlexSearch();

  flexSearchInstance = new FlexSearchIndex({
    tokenize: "forward",
    resolution: 9,
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const text = `${entry.title} ${entry.section} ${entry.headings.map(h => h.title).join(" ")} ${entry.body}`;
    flexSearchInstance.add(i, text);
  }

  flexSearchEntries = entries;
  return flexSearchInstance;
}
