import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrowserArtifact, BrowserArtifactKind } from "@/types/browser";

const BUCKET_NAME = "browser-artifacts";

/**
 * Store a browser artifact (screenshot, DOM snapshot, etc.) to Supabase Storage
 * and record metadata in the database.
 */
export async function storeBrowserArtifact(
  admin: SupabaseClient,
  opts: {
    sessionId: string;
    tenantId: string;
    customerId: string;
    kind: BrowserArtifactKind;
    data: Buffer | Uint8Array;
    contentType: string;
    actionIndex: number;
    metadata?: Record<string, unknown>;
  }
): Promise<BrowserArtifact> {
  const storageKey = `${opts.tenantId}/${opts.sessionId}/${opts.kind}_${opts.actionIndex}_${Date.now()}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await admin.storage
    .from(BUCKET_NAME)
    .upload(storageKey, opts.data, {
      contentType: opts.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload browser artifact: ${uploadError.message}`);
  }

  // Record in database
  const { data: row, error: insertError } = await admin
    .from("tenant_browser_artifacts")
    .insert({
      session_id: opts.sessionId,
      tenant_id: opts.tenantId,
      customer_id: opts.customerId,
      kind: opts.kind,
      storage_key: storageKey,
      metadata: opts.metadata ?? {},
      action_index: opts.actionIndex,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to record browser artifact: ${insertError.message}`);
  }

  return {
    id: row.id,
    sessionId: opts.sessionId,
    kind: opts.kind,
    storageKey,
    actionIndex: opts.actionIndex,
    metadata: opts.metadata,
  };
}

/**
 * Load artifact metadata for a browser session.
 */
export async function loadBrowserArtifacts(
  admin: SupabaseClient,
  sessionId: string,
  tenantId?: string
): Promise<BrowserArtifact[]> {
  let query = admin
    .from("tenant_browser_artifacts")
    .select("id, session_id, kind, storage_key, action_index, metadata")
    .eq("session_id", sessionId)
    .order("action_index", { ascending: true });

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    kind: r.kind as BrowserArtifactKind,
    storageKey: r.storage_key,
    actionIndex: r.action_index,
    metadata: r.metadata as Record<string, unknown>,
  }));
}

/**
 * Generate a signed URL for a browser artifact.
 */
export async function getBrowserArtifactUrl(
  admin: SupabaseClient,
  storageKey: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storageKey, expiresIn);

  if (error || !data) return null;
  return data.signedUrl;
}
