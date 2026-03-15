import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailIdentityForm } from "@/components/settings/email-identity-form";
import { AgentEmailIdentityCard } from "@/components/settings/agent-email-identity-card";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { getCustomerTenant } from "@/lib/auth/dashboard-session";
import { Skeleton } from "@/components/ui/skeleton";

export default async function EmailSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Email</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Set up email identities for your team and individual agents
        </p>
      </div>
      <Suspense fallback={<EmailSkeleton />}>
        <EmailContent customerId={customerId} />
      </Suspense>
    </div>
  );
}

interface AgentRow {
  id: string;
  display_name: string;
  role: string | null;
  is_default: boolean;
}

interface AgentIdentityRow {
  id: string;
  agent_id: string;
  slug: string;
  address: string;
  sender_alias: string;
  provider_mailbox_id: string | null;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

async function EmailContent({ customerId }: { customerId: string }) {
  const admin = createAdminClient();
  const tenant = await getCustomerTenant(customerId);

  const { data: identity } = await admin
    .from("email_identities")
    .select("slug, address, sender_alias, provider_mailbox_id")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .eq("identity_type", "team")
    .is("agent_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Load non-default agents and their email identities
  let agents: AgentRow[] = [];
  let agentIdentities: AgentIdentityRow[] = [];

  if (tenant) {
    const { data: agentRows } = await admin
      .from("tenant_agents")
      .select("id, display_name, role, is_default")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (agentRows) {
      agents = agentRows as AgentRow[];
    }

    const { data: identRows } = await admin
      .from("email_identities")
      .select("id, agent_id, slug, address, sender_alias, provider_mailbox_id, is_active, updated_at, created_at")
      .eq("tenant_id", tenant.id)
      .eq("identity_type", "agent")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (identRows) {
      agentIdentities = identRows as AgentIdentityRow[];
    }
  }

  const identityMap = new Map<string, AgentIdentityRow>();
  for (const identityRow of agentIdentities) {
    if (!identityRow.agent_id || identityMap.has(identityRow.agent_id)) {
      continue;
    }
    identityMap.set(identityRow.agent_id, identityRow);
  }

  const nonDefaultAgents = agents.filter((a) => !a.is_default);

  return (
    <>
      <EmailIdentityForm initialIdentity={identity || null} />

      {nonDefaultAgents.length > 0 && tenant && (
        <div className="space-y-4">
          <div>
            <h2 className="font-headline text-lg font-semibold">Agent Email Addresses</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Give individual agents their own email addresses for direct routing
            </p>
          </div>
          {nonDefaultAgents.map((agent) => {
            const agentIdentity = identityMap.get(agent.id);
            return (
              <AgentEmailIdentityCard
                key={agent.id}
                tenantId={tenant.id}
                agentId={agent.id}
                agentName={agent.display_name}
                agentRole={agent.role}
                initialIdentity={
                  agentIdentity
                    ? {
                        slug: agentIdentity.slug,
                        address: agentIdentity.address,
                        sender_alias: agentIdentity.sender_alias,
                        is_active: agentIdentity.is_active,
                        is_locked: Boolean(agentIdentity.provider_mailbox_id),
                      }
                    : null
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function EmailSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <Skeleton className="h-10 rounded-lg mb-4" />
      <Skeleton className="h-10 rounded-lg mb-4" />
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}
