import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { McpServerList } from "@/components/settings/mcp-server-list";

export default async function McpServersSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  const instance = await getCustomerInstance(customerId);

  if (!instance) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">
            MCP Servers
          </h3>
          <p className="text-foreground/60 text-sm">
            Provision your instance first to configure MCP tool servers.
          </p>
        </div>
      </div>
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: mcpServers } = await admin
    .from("mcp_server_configs")
    .select("*")
    .eq("instance_id", instance.id)
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-headline text-lg font-semibold mb-1">
          MCP Servers
        </h3>
        <p className="text-foreground/60 text-sm">
          Connect your assistant to MCP tool servers for filesystem, database,
          and memory capabilities.
        </p>
      </div>
      <McpServerList
        initialServers={mcpServers || []}
        instanceId={instance.id}
      />
    </div>
  );
}
