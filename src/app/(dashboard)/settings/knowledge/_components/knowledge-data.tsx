import { createClient } from "@/lib/supabase/server";
import { getCustomerInstance } from "@/lib/auth/dashboard-session";
import { KnowledgePanel } from "@/components/settings/knowledge-panel";
import { KNOWLEDGE_META_COLUMNS } from "@/types/knowledge";
import type { KnowledgeFileMeta } from "@/types/knowledge";
import type { PersonalityPreset } from "@/types/agent";

export async function KnowledgeData({
  customerId,
  tenantId,
}: {
  customerId: string;
  tenantId: string;
}) {
  const [supabase, instance] = await Promise.all([
    createClient(),
    getCustomerInstance(customerId),
  ]);

  const [{ data: tenantFiles }, { data: tenantAgents }] = await Promise.all([
    supabase
      .from("tenant_knowledge_items")
      .select("id, tenant_id, customer_id, legacy_knowledge_file_id, title, status, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_agents")
      .select("id, legacy_agent_id, agent_key, display_name, config")
      .eq("tenant_id", tenantId)
      .neq("status", "archived")
      .order("sort_order", { ascending: true }),
  ]);

  const mappedTenantFiles: KnowledgeFileMeta[] = Array.isArray(tenantFiles)
    ? tenantFiles.map((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      return {
        id:
          typeof row.legacy_knowledge_file_id === "string"
            ? row.legacy_knowledge_file_id
            : row.id,
        customer_id: row.customer_id,
        instance_id: instance?.id || tenantId,
        agent_id: typeof metadata.agent_id === "string" ? metadata.agent_id : null,
        file_name: row.title,
        file_type:
          metadata.file_type === "pdf" ||
            metadata.file_type === "docx" ||
            metadata.file_type === "md" ||
            metadata.file_type === "txt"
            ? metadata.file_type
            : "txt",
        file_size_bytes:
          typeof metadata.file_size_bytes === "number" ? metadata.file_size_bytes : 0,
        parsed_size_bytes:
          typeof metadata.parsed_size_bytes === "number" ? metadata.parsed_size_bytes : 0,
        status:
          row.status === "active" ||
            row.status === "processing" ||
            row.status === "failed" ||
            row.status === "archived"
            ? row.status
            : "active",
        error_message:
          typeof metadata.error_message === "string" ? metadata.error_message : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } satisfies KnowledgeFileMeta;
    })
    : [];

  let files = mappedTenantFiles;
  if (files.length === 0 && instance) {
    const { data: legacyFiles } = await supabase
      .from("knowledge_files")
      .select(KNOWLEDGE_META_COLUMNS)
      .eq("customer_id", customerId)
      .eq("instance_id", instance.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    files = (legacyFiles || []) as KnowledgeFileMeta[];
  }

  const mappedTenantAgents = Array.isArray(tenantAgents)
    ? tenantAgents.map((row) => {
      const config =
        row.config && typeof row.config === "object" && !Array.isArray(row.config)
          ? (row.config as Record<string, unknown>)
          : {};
      const personalityPreset =
        typeof config.personality_preset === "string"
          ? (config.personality_preset as PersonalityPreset)
          : "general";

      return {
        id:
          typeof row.legacy_agent_id === "string"
            ? row.legacy_agent_id
            : row.id,
        agent_key: row.agent_key,
        display_name: row.display_name,
        personality_preset: personalityPreset,
      };
    })
    : [];

  let agents = mappedTenantAgents;
  if (agents.length === 0 && instance) {
    const { data: legacyAgents } = await supabase
      .from("agents")
      .select("id, agent_key, display_name, personality_preset")
      .eq("instance_id", instance.id)
      .order("sort_order", { ascending: true });
    agents = legacyAgents || [];
  }

  return (
    <KnowledgePanel
      files={files}
      tenantId={tenantId}
      agents={agents}
    />
  );
}
