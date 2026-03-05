import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { McpServerList } from "@/components/settings/mcp-server-list";
import type { McpServerConfig } from "@/types/mcp";

export const metadata: Metadata = { title: "MCP Servers" };

export default async function McpServersSettingsPage() {
  const [{ customerId }, admin] = await Promise.all([
    requireDashboardCustomer(),
    Promise.resolve(createAdminClient()),
  ]);

  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">
            MCP Servers
          </h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before configuring MCP tool servers.
          </p>
        </div>
      </div>
    );
  }
  const { data: mapping } = await admin
    .from("instance_tenant_mappings")
    .select("instance_id")
    .eq("tenant_id", tenant.id)
    .eq("mapping_status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let mcpServers: McpServerConfig[] = [];
  if (mapping?.instance_id) {
    const { data: mappedMcpServers } = await admin
      .from("mcp_server_configs")
      .select("*")
      .eq("instance_id", mapping.instance_id)
      .order("created_at", { ascending: true });
    mcpServers = mappedMcpServers || [];
  }

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
        initialServers={mcpServers}
        tenantId={tenant.id}
      />
    </div>
  );
}
