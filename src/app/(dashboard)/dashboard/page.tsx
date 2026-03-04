import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InstanceStatusCard } from "@/components/dashboard/instance-status-card";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { MessageActivityChartLazy as MessageActivityChart } from "@/components/dashboard/message-activity-chart-lazy";
import { SpendingAlertBanner } from "@/components/dashboard/spending-alert-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTokens, formatCents } from "@/lib/utils/format";
import { SUBSCRIPTION_PRICE_CENTS } from "@/lib/utils/constants";
import type { Metadata } from "next";
import {
  requireDashboardCustomer,
  getCustomerTenant,
} from "@/lib/auth/dashboard-session";
import { DashboardApprovals } from "./_components/dashboard-approvals";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [{ customerId }, supabase] = await Promise.all([
    requireDashboardCustomer(),
    createClient(),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const [
    tenant,
    { data: emailIdentity },
    { data: usage },
    { data: conversationEvents },
    { data: customer },
  ] = await Promise.all([
    getCustomerTenant(customerId),
    supabase
      .from("email_identities")
      .select("address")
      .eq("customer_id", customerId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("api_usage")
      .select("input_tokens, output_tokens, estimated_cost_cents")
      .eq("customer_id", customerId)
      .gte("date", startOfMonth.toISOString().split("T")[0]),
    supabase
      .from("conversation_events")
      .select("date, message_count")
      .eq("customer_id", customerId)
      .gte("date", sevenDaysAgoStr)
      .order("date", { ascending: true }),
    supabase
      .from("customers")
      .select("spending_cap_cents, spending_cap_auto_pause")
      .eq("id", customerId)
      .single(),
  ]);

  if (!tenant) {
    redirect("/onboarding");
  }

  const totalTokens = (usage || []).reduce(
    (sum, u) => sum + (u.input_tokens || 0) + (u.output_tokens || 0),
    0
  );
  const totalCostCents = (usage || []).reduce(
    (sum, u) => sum + (u.estimated_cost_cents || 0),
    0
  );

  const eventsByDate = new Map<string, number>();
  for (const event of conversationEvents || []) {
    const existing = eventsByDate.get(event.date) || 0;
    eventsByDate.set(event.date, existing + event.message_count);
  }

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateKey = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      messages: eventsByDate.get(dateKey) || 0,
    };
  });

  const messagesToday = eventsByDate.get(today) || 0;

  const now = new Date();
  const uptimeHours = Math.floor(
    (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60)
  );

  const capCents = customer?.spending_cap_cents ?? null;
  const capPercentage =
    capCents && capCents > 0
      ? Math.round((totalCostCents / capCents) * 100)
      : null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="font-headline text-2xl font-semibold text-foreground">
          Dashboard
        </h2>
        <p className="text-foreground/60 text-sm mt-1">
          Your farm assistant at a glance.
        </p>
      </div>

      {capPercentage !== null && capPercentage >= 80 && (
        <SpendingAlertBanner
          percentage={capPercentage}
          currentCents={totalCostCents}
          capCents={capCents!}
        />
      )}

      <QuickStats
        messagesToday={messagesToday}
        uptimeHours={uptimeHours}
        tokensUsed={formatTokens(totalTokens)}
        monthlyCost={formatCents(totalCostCents + SUBSCRIPTION_PRICE_CENTS)}
      />

      <Suspense fallback={<Skeleton className="h-28 rounded-xl" />}>
        <DashboardApprovals tenantId={tenant.id} />
      </Suspense>

      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-headline text-base font-semibold text-foreground">
              Optional Email Ingestion
            </h3>
            <p className="text-sm text-foreground/60 mt-1">
              Not needed for onboarding. Enable it only if you want to send
              files into FarmClaw by email.
            </p>
            <p className="text-xs text-foreground/50 mt-2">
              Status:{" "}
              <span className="font-mono">
                {emailIdentity?.address || "Not enabled"}
              </span>
            </p>
          </div>

          <Link
            href="/settings/email"
            className="inline-flex items-center justify-center border border-border hover:bg-muted text-foreground rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
          >
            {emailIdentity ? "Manage Email" : "Enable Email"}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MessageActivityChart data={chartData} />
        </div>
        <div>
          <InstanceStatusCard tenantId={tenant.id} />
        </div>
      </div>
    </div>
  );
}
