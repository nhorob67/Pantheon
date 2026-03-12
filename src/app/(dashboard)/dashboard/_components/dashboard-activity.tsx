import { createAdminClient } from "@/lib/supabase/admin";
import { AgentActivityFeed } from "@/components/dashboard/agent-activity-feed";
import { fetchActivityFeed } from "@/lib/queries/activity-feed";

interface DashboardActivityProps {
  tenantId: string;
}

export async function DashboardActivity({ tenantId }: DashboardActivityProps) {
  const admin = createAdminClient();
  const { events, agentNames } = await fetchActivityFeed(admin, tenantId);
  return <AgentActivityFeed events={events} agentNames={agentNames} />;
}
