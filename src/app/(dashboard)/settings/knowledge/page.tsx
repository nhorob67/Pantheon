import { createClient } from "@/lib/supabase/server";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { KnowledgePanel } from "@/components/settings/knowledge-panel";
import { KNOWLEDGE_META_COLUMNS } from "@/types/knowledge";

export default async function KnowledgeSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();

  const [{ data: files }, instance, { data: agents }] =
    await Promise.all([
      supabase
        .from("knowledge_files")
        .select(KNOWLEDGE_META_COLUMNS)
        .eq("customer_id", customerId)
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      getCustomerInstance(customerId),
      supabase
        .from("agents")
        .select("id, agent_key, display_name, personality_preset")
        .eq("customer_id", customerId)
        .order("sort_order", { ascending: true }),
    ]);

  return (
    <KnowledgePanel
      files={files || []}
      instanceId={instance?.id || ""}
      agents={agents || []}
    />
  );
}
