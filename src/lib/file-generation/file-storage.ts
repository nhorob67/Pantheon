import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileFormat, AgentFileRecord } from "@/types/file-creation";

const BUCKET_NAME = "agent-files";

/**
 * Store an agent-generated file in Supabase Storage and record metadata.
 */
export async function storeAgentFile(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    customerId: string;
    agentId: string | null;
    filename: string;
    fileFormat: FileFormat;
    data: Buffer;
    contentType: string;
    channelId?: string | null;
  }
): Promise<{ storageKey: string; signedUrl: string; recordId: string }> {
  const timestamp = Date.now();
  const storageKey = `${opts.tenantId}/${opts.agentId ?? "shared"}/${timestamp}_${opts.filename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await admin.storage
    .from(BUCKET_NAME)
    .upload(storageKey, opts.data, {
      contentType: opts.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload agent file: ${uploadError.message}`);
  }

  // Generate signed URL
  const { data: urlData, error: urlError } = await admin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storageKey, 3600);

  if (urlError || !urlData) {
    throw new Error(`Failed to create signed URL: ${urlError?.message ?? "unknown"}`);
  }

  // Record in database
  const { data: row, error: insertError } = await admin
    .from("tenant_agent_files")
    .insert({
      tenant_id: opts.tenantId,
      customer_id: opts.customerId,
      agent_id: opts.agentId,
      file_name: opts.filename,
      file_format: opts.fileFormat,
      content_type: opts.contentType,
      size_bytes: opts.data.length,
      storage_key: storageKey,
      channel_id: opts.channelId ?? null,
      delivered_via: "discord_attachment",
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to record agent file: ${insertError.message}`);
  }

  return {
    storageKey,
    signedUrl: urlData.signedUrl,
    recordId: row.id,
  };
}

/**
 * Generate a signed URL for a previously stored agent file.
 */
export async function getAgentFileUrl(
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

/**
 * List recently generated files for a tenant.
 */
export async function listAgentFiles(
  admin: SupabaseClient,
  tenantId: string,
  limit = 50
): Promise<AgentFileRecord[]> {
  const { data, error } = await admin
    .from("tenant_agent_files")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AgentFileRecord[];
}
