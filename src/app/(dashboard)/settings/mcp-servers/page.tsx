import { Suspense } from "react";
import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { McpServerList } from "@/components/settings/mcp-server-list";
import { ComposioIntegrationPanel } from "@/components/settings/composio/composio-integration-panel";
import type { McpServerConfig } from "@/types/mcp";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";
import { Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<ToolsSkeleton />}>
      <ToolsContent customerId={customerId} />
    </Suspense>
  );
}

async function ToolsContent({ customerId }: { customerId: string }) {
  const admin = createAdminClient();

  // Fetch tenant + composio config in parallel (composio doesn't depend on tenant)
  const [tenant, composioResult] = await Promise.all([
    getCustomerTenant(customerId),
    admin
      .from("composio_configs")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Tools</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Complete onboarding to configure tools and integrations.
          </p>
        </div>
      </div>
    );
  }

  const mappingResult = await admin
    .from("instance_tenant_mappings")
    .select("instance_id")
    .eq("tenant_id", tenant.id)
    .eq("mapping_status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Tools</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Connect your agents to MCP tool servers and third-party integrations
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

function ToolsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="mb-8">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="border-t border-border my-8" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
