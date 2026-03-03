import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryCaptureLevel } from "@/types/memory";

export interface TenantMemorySettings {
  captureLevel: MemoryCaptureLevel;
  excludeCategories: string[];
  autoCompress: boolean;
}

const DEFAULTS: TenantMemorySettings = {
  captureLevel: "standard",
  excludeCategories: [],
  autoCompress: true,
};

export async function loadTenantMemorySettings(
  admin: SupabaseClient,
  tenantId: string
): Promise<TenantMemorySettings> {
  try {
    const { data } = await admin
      .from("tenant_memory_settings_v")
      .select("capture_level, exclude_categories, auto_compress")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!data) return DEFAULTS;

    return {
      captureLevel: (data.capture_level as MemoryCaptureLevel) ?? DEFAULTS.captureLevel,
      excludeCategories: Array.isArray(data.exclude_categories)
        ? data.exclude_categories
        : DEFAULTS.excludeCategories,
      autoCompress: typeof data.auto_compress === "boolean"
        ? data.auto_compress
        : DEFAULTS.autoCompress,
    };
  } catch {
    return DEFAULTS;
  }
}
