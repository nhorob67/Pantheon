import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatCents } from "@/lib/utils/format";
import { CustomerInstanceActions } from "@/components/admin/customer-instance-actions";
import type { ApiUsage, Customer, FarmProfile, Instance } from "@/types/database";

function getFirstRelation<T extends object>(value: unknown): T | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const first = value[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  return first as T;
}

function getSubscriptionStatus(value: unknown): Customer["subscription_status"] {
  if (
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "incomplete"
  ) {
    return value;
  }

  return "incomplete";
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const [{ data: customer }, { data: usage }] = await Promise.all([
    admin
      .from("customers")
      .select("*, farm_profiles(*), instances(*), skill_configs(*)")
      .eq("id", id)
      .single(),
    admin
      .from("api_usage")
      .select("*")
      .eq("customer_id", id)
      .order("date", { ascending: false })
      .limit(30),
  ]);

  if (!customer) {
    notFound();
  }

  const profile = getFirstRelation<FarmProfile>(customer.farm_profiles);
  const instance = getFirstRelation<Instance>(customer.instances);
  const usageRows = Array.isArray(usage) ? (usage as ApiUsage[]) : [];
  const totalCost = usageRows.reduce(
    (sum, usageRow) => sum + usageRow.estimated_cost_cents,
    0
  );
  const subscriptionStatus = getSubscriptionStatus(customer.subscription_status);

  const statusColors: Record<Customer["subscription_status"], string> = {
    active: "bg-primary/10 text-primary",
    past_due: "bg-energy/10 text-amber-700",
    canceled: "bg-destructive/10 text-destructive",
    incomplete: "bg-muted text-foreground/60",
  };

  return (
    <div>
      <Link
        href="/admin/customers"
        className="flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to customers
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <h2 className="font-headline text-2xl font-bold text-foreground">
          {customer.email || "Unknown"}
        </h2>
        <span
          className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full ${
            statusColors[subscriptionStatus]
          }`}
        >
          {subscriptionStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Farm Profile */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
            Farm Profile
          </h3>
          {profile ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-foreground/50">Farm Name</dt>
                <dd className="text-foreground font-medium">
                  {profile.farm_name || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground/50">Location</dt>
                <dd className="text-foreground font-medium">
                  {profile.county ? `${profile.county}, ${profile.state}` : profile.state}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground/50">Acres</dt>
                <dd className="text-foreground font-medium">
                  {profile.acres?.toLocaleString() || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground/50">Crops</dt>
                <dd className="text-foreground font-medium text-right max-w-[60%]">
                  {profile.primary_crops.join(", ") || "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-foreground/40 text-sm">No profile yet</p>
          )}
        </div>

        {/* Instance */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
            Instance
          </h3>
          {instance ? (
            <>
              <dl className="space-y-3 text-sm mb-4">
                <div className="flex justify-between">
                  <dt className="text-foreground/50">Status</dt>
                  <dd className="font-mono text-xs uppercase">
                    {instance.status}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/50">Version</dt>
                  <dd className="font-mono text-xs">
                    {instance.openclaw_version || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/50">Last Health Check</dt>
                  <dd className="text-xs text-foreground/80">
                    {instance.last_health_check
                      ? new Date(instance.last_health_check).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/50">Coolify UUID</dt>
                  <dd className="font-mono text-xs text-foreground/60 truncate max-w-[200px]">
                    {instance.coolify_uuid || "—"}
                  </dd>
                </div>
              </dl>
              <CustomerInstanceActions instanceId={instance.id} />
            </>
          ) : (
            <p className="text-foreground/40 text-sm">No instance provisioned</p>
          )}
        </div>

        {/* Usage Summary */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 lg:col-span-2">
          <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
            Usage (Last 30 days)
          </h3>
          {usageRows.length > 0 ? (
            <div>
              <p className="text-sm text-foreground/60 mb-3">
                Total estimated cost:{" "}
                <span className="font-mono font-medium text-foreground">
                  {formatCents(totalCost)}
                </span>
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 font-medium text-foreground/60">
                      Date
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-foreground/60">
                      Model
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-foreground/60">
                      Input
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-foreground/60">
                      Output
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-foreground/60">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageRows.slice(0, 10).map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 text-foreground/80">
                        {u.date}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground/60">
                        {u.model}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {u.input_tokens.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {u.output_tokens.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatCents(u.estimated_cost_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-foreground/40 text-sm">No usage data</p>
          )}
        </div>
      </div>
    </div>
  );
}
