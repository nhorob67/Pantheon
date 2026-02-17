import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type {
  ExtensionCatalogFilters,
} from "@/lib/validators/extensibility";
import type { ExtensionCatalogItem } from "@/types/extensibility";

export interface ExtensionCatalogListItem extends ExtensionCatalogItem {
  latest_version: string | null;
  latest_version_id: string | null;
  latest_published_at: string | null;
}

export interface ExtensionCatalogListResult {
  items: ExtensionCatalogListItem[];
  total: number;
  page: number;
  per_page: number;
}

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%_.,()\\]/g, "").trim();
}

export async function listExtensionCatalog(
  filters: ExtensionCatalogFilters
): Promise<ExtensionCatalogListResult> {
  const { search, kind, source_type, verified, page, per_page } = filters;
  const active = filters.active ?? true;
  const offset = (page - 1) * per_page;
  const admin = createAdminClient();

  let query = admin
    .from("extension_catalog_items")
    .select("*", { count: "exact" })
    .eq("active", active)
    .order("display_name", { ascending: true })
    .range(offset, offset + per_page - 1);

  if (search) {
    const sanitized = sanitizeSearchTerm(search);
    if (sanitized.length > 0) {
      query = query.or(
        `slug.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`
      );
    }
  }

  if (kind) {
    query = query.eq("kind", kind);
  }
  if (source_type) {
    query = query.eq("source_type", source_type);
  }
  if (typeof verified === "boolean") {
    query = query.eq("verified", verified);
  }

  const { data: items, count, error } = await query;

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load extension catalog"));
  }

  const typedItems = (items || []) as ExtensionCatalogItem[];
  if (typedItems.length === 0) {
    return {
      items: [],
      total: count || 0,
      page,
      per_page,
    };
  }

  const itemIds = typedItems.map((item) => item.id);
  const { data: versions, error: versionsError } = await admin
    .from("extension_catalog_versions")
    .select("id, item_id, version, published_at")
    .in("item_id", itemIds)
    .order("published_at", { ascending: false });

  if (versionsError) {
    throw new Error(
      safeErrorMessage(versionsError, "Failed to load extension catalog versions")
    );
  }

  const latestVersionByItemId = new Map<
    string,
    { id: string; version: string; published_at: string }
  >();
  for (const row of versions || []) {
    if (!latestVersionByItemId.has(row.item_id)) {
      latestVersionByItemId.set(row.item_id, {
        id: row.id,
        version: row.version,
        published_at: row.published_at,
      });
    }
  }

  const enrichedItems: ExtensionCatalogListItem[] = typedItems.map((item) => {
    const latest = latestVersionByItemId.get(item.id);
    return {
      ...item,
      latest_version: latest?.version || null,
      latest_version_id: latest?.id || null,
      latest_published_at: latest?.published_at || null,
    };
  });

  return {
    items: enrichedItems,
    total: count || 0,
    page,
    per_page,
  };
}
