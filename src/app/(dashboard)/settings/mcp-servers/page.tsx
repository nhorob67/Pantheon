import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { McpServerList } from "@/components/settings/mcp-server-list";
import { ComposioIntegrationPanel } from "@/components/settings/composio/composio-integration-panel";
import type { McpServerConfig } from "@/types/mcp";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";
import { Server } from "lucide-react";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsSettingsPage() {
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
            Tools
          </h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before configuring tools.
          </p>
        </div>
      </div>
    );
  }

  const [mappingResult, composioResult] = await Promise.all([
    admin
      .from("instance_tenant_mappings")
      .select("instance_id")
      .eq("tenant_id", tenant.id)
      .eq("mapping_status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("composio_configs")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  let mcpServers: McpServerConfig[] = [];
  if (mappingResult.data?.instance_id) {
    const { data: mappedMcpServers } = await admin
      .from("mcp_server_configs")
      .select("*")
      .eq("instance_id", mappingResult.data.instance_id)
      .order("created_at", { ascending: true });
    mcpServers = mappedMcpServers || [];
  }

  const composioConfig: ComposioConfig | null = composioResult.data
    ? {
        ...composioResult.data,
        connected_apps: (composioResult.data.connected_apps || []) as ComposioConnectedApp[],
      }
    : null;

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-headline text-lg font-semibold mb-1">Tools</h3>
        <p className="text-foreground/60 text-sm">
          Connect your assistant to MCP tool servers and third-party
          integrations.
        </p>
      </div>

      {/* MCP Servers Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-text-secondary" />
          <h4 className="font-headline text-base font-semibold text-text-primary">
            MCP Servers
          </h4>
        </div>
        <McpServerList initialServers={mcpServers} tenantId={tenant.id} />
      </div>

      {/* Divider */}
      <div className="border-t border-border my-8" />

      {/* Third-Party Integrations Section */}
      <div>
        <ComposioIntegrationPanel
          tenantId={tenant.id}
          initialConfig={composioConfig}
        />
      </div>
    </div>
  );
}
