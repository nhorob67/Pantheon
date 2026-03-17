import { Suspense } from "react";
import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ToolCatalogPanel } from "@/components/settings/tool-catalog-panel";
import { ensureNativeToolCatalog } from "@/lib/runtime/tool-catalog";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Tool Catalog" };

export default async function ToolCatalogPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<ToolCatalogSkeleton />}>
      <ToolCatalogContent customerId={customerId} />
    </Suspense>
  );
}

async function ToolCatalogContent({ customerId }: { customerId: string }) {
  const admin = createAdminClient();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Tool Catalog</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Complete onboarding to manage your tool catalog.
          </p>
        </div>
      </div>
    );
  }

  // Ensure native tools are seeded
  await ensureNativeToolCatalog(admin, tenant.id, customerId);

  // Fetch tools with policies, guardrails, and MCP server health
  const [{ data: tools }, { data: guardrailRow }, { data: mcpServers }] = await Promise.all([
    admin
      .from("tenant_tools")
      .select(
        "id, tool_key, display_name, description, status, risk_level, metadata, tenant_tool_policies(approval_mode, allow_roles, max_calls_per_hour, timeout_ms)"
      )
      .eq("tenant_id", tenant.id)
      .order("tool_key", { ascending: true }),
    admin
      .from("tenant_run_budget_configs")
      .select(
        "loop_warning_threshold, loop_hard_stop_threshold, max_tool_invocations, max_elapsed_ms, max_tokens, max_spend_cents"
      )
      .eq("tenant_id", tenant.id)
      .is("agent_id", null)
      .maybeSingle(),
    admin
      .from("mcp_server_configs")
      .select("server_key, health_status, tools_discovered_at")
      .eq("customer_id", customerId)
      .eq("enabled", true),
  ]);

  const normalized = (tools ?? []).map((t) => ({
    ...t,
    policy: Array.isArray(t.tenant_tool_policies)
      ? t.tenant_tool_policies[0] ?? null
      : t.tenant_tool_policies ?? null,
    tenant_tool_policies: undefined,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Tool Catalog</h1>
        <p className="text-sm text-foreground/60 mt-1">
          View and manage all registered tools, risk levels, approval policies, and run guardrails
        </p>
      </div>

      <ToolCatalogPanel
        tenantId={tenant.id}
        tools={normalized as Parameters<typeof ToolCatalogPanel>[0]["tools"]}
        guardrailConfig={guardrailRow as Parameters<typeof ToolCatalogPanel>[0]["guardrailConfig"]}
        mcpServerHealth={(mcpServers ?? []) as Parameters<typeof ToolCatalogPanel>[0]["mcpServerHealth"]}
      />
    </div>
  );
}

function ToolCatalogSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
