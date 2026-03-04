import { createClient } from "@/lib/supabase/server";
import { UsageChartLazy as UsageChart } from "@/components/usage/usage-chart-lazy";
import { UsageTable } from "@/components/usage/usage-table";
import { CostBreakdown } from "@/components/usage/cost-breakdown";
import { CostTicker } from "@/components/usage/cost-ticker";
import { AgentCostAttributionLazy as AgentCostAttribution } from "@/components/usage/agent-cost-attribution-lazy";
import { CostPerConversation } from "@/components/usage/cost-per-conversation";
import { ConsultantComparison } from "@/components/usage/consultant-comparison";
import type { UsageByDay, UsageSummary } from "@/types/billing";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { projectMonthlyCost } from "@/lib/utils/cost-projection";

export default async function UsagePage() {
  const [{ customerId }, supabase] = await Promise.all([
    requireDashboardCustomer(),
    createClient(),
  ]);

  // Fetch this month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: usage },
    { data: conversationEvents },
    { data: agents },
    { data: customer },
  ] = await Promise.all([
    supabase
      .from("api_usage")
      .select("*")
      .eq("customer_id", customerId)
      .gte("date", startOfMonth.toISOString().split("T")[0])
      .order("date", { ascending: true }),
    supabase
      .from("conversation_events")
      .select("agent_key, message_count, conversation_count")
      .eq("customer_id", customerId)
      .gte("date", startOfMonth.toISOString().split("T")[0]),
    supabase
      .from("agents")
      .select("agent_key, display_name")
      .eq("customer_id", customerId),
    supabase
      .from("customers")
      .select("spending_cap_cents")
      .eq("id", customerId)
      .single(),
  ]);

  const rows: UsageSummary[] = (usage || []).map((u) => ({
    date: u.date,
    model: u.model,
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    estimated_cost_cents: u.estimated_cost_cents,
  }));

  // Aggregate by day for chart
  const byDayMap = new Map<string, UsageByDay>();
  const dailyCosts: number[] = [];
  for (const row of rows) {
    const existing = byDayMap.get(row.date);
    if (existing) {
      existing.total_input_tokens += row.input_tokens;
      existing.total_output_tokens += row.output_tokens;
      existing.total_cost_cents += row.estimated_cost_cents;
    } else {
      byDayMap.set(row.date, {
        date: row.date,
        total_input_tokens: row.input_tokens,
        total_output_tokens: row.output_tokens,
        total_cost_cents: row.estimated_cost_cents,
      });
    }
  }
  for (const day of byDayMap.values()) {
    dailyCosts.push(day.total_cost_cents);
  }
  const chartData = Array.from(byDayMap.values());

  const totalApiCents = rows.reduce(
    (sum, r) => sum + r.estimated_cost_cents,
    0
  );

  // Cost projection
  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const projection = projectMonthlyCost(
    totalApiCents,
    daysElapsed,
    daysInMonth,
    dailyCosts
  );

  // Conversation totals
  const totalConversations = (conversationEvents || []).reduce(
    (sum, e) => sum + (e.conversation_count || 0),
    0
  );
  const totalMessages = (conversationEvents || []).reduce(
    (sum, e) => sum + (e.message_count || 0),
    0
  );

  // Agent cost attribution (proportional by message count)
  const agentNameMap = new Map(
    (agents || []).map((a) => [a.agent_key, a.display_name])
  );
  const agentMessages = new Map<string, number>();
  for (const event of conversationEvents || []) {
    const key = event.agent_key || "default";
    agentMessages.set(key, (agentMessages.get(key) || 0) + event.message_count);
  }

  const agentCostData = Array.from(agentMessages.entries())
    .map(([key, messages]) => ({
      agent_key: key,
      display_name: agentNameMap.get(key) || key,
      messages,
      cost_cents:
        totalMessages > 0
          ? Math.round((messages / totalMessages) * totalApiCents)
          : 0,
    }))
    .sort((a, b) => b.cost_cents - a.cost_cents);

  const capCents = customer?.spending_cap_cents ?? null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="font-headline text-2xl font-semibold text-foreground">
          API Usage
        </h2>
        <p className="text-foreground/60 text-sm mt-1">
          Token consumption, cost estimates, and projections for the current
          billing period.
        </p>
      </div>

      {/* Top row: ticker + cost breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CostTicker
          apiUsageCents={totalApiCents}
          projectedCents={projection.projected}
          daysElapsed={daysElapsed}
          daysInMonth={daysInMonth}
          capCents={capCents}
        />
        <CostBreakdown apiUsageCents={totalApiCents} />
      </div>

      {/* Chart + per-agent attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UsageChart data={chartData} />
        </div>
        <div className="space-y-6">
          <CostPerConversation
            totalCostCents={totalApiCents}
            totalConversations={totalConversations}
          />
          {agentCostData.length > 1 && (
            <AgentCostAttribution data={agentCostData} />
          )}
        </div>
      </div>

      <ConsultantComparison
        totalConversations={totalConversations}
        apiUsageCents={totalApiCents}
      />

      <UsageTable data={rows} />
    </div>
  );
}
