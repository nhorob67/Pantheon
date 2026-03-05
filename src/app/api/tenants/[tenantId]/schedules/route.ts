import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthorizedTenantContext } from "@/lib/runtime/tenant-auth";
import { createCustomScheduleSchema } from "@/lib/validators/schedule";
import { computeNextRun } from "@/lib/schedules/compute-next-run";

const MAX_CUSTOM_SCHEDULES = 25;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const { user, customerId } = await requireDashboardCustomer();

  const supabase = await createClient();
  const tenantContext = await resolveAuthorizedTenantContext(
    supabase,
    user.id,
    tenantId
  );

  if (!tenantContext || tenantContext.customerId !== customerId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Optional agent_id filter
  const url = new URL(request.url);
  const agentIdFilter = url.searchParams.get("agent_id");

  let query = admin
    .from("tenant_scheduled_messages")
    .select(
      "id, schedule_key, cron_expression, timezone, enabled, last_run_at, next_run_at, agent_id, channel_id, metadata, schedule_type, display_name, prompt, tools, created_by, created_at, updated_at, tenant_agents(display_name)"
    )
    .eq("tenant_id", tenantContext.tenantId)
    .order("enabled", { ascending: false })
    .order("created_at", { ascending: false });

  if (agentIdFilter) {
    query = query.eq("agent_id", agentIdFilter);
  }

  const { data: schedules, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (schedules || []).map((s) => {
    const agentJoin = s.tenant_agents as
      | { display_name: string }
      | { display_name: string }[]
      | null;
    const agentName = agentJoin
      ? Array.isArray(agentJoin)
        ? agentJoin[0]?.display_name ?? null
        : agentJoin.display_name
      : null;

    return {
      id: s.id,
      schedule_key: s.schedule_key,
      cron_expression: s.cron_expression,
      timezone: s.timezone,
      enabled: s.enabled,
      last_run_at: s.last_run_at,
      next_run_at: s.next_run_at,
      agent_id: s.agent_id,
      agent_name: agentName,
      channel_id: s.channel_id,
      metadata: s.metadata,
      schedule_type: s.schedule_type ?? "predefined",
      display_name: s.display_name,
      prompt: s.prompt,
      tools: s.tools ?? [],
      created_by: s.created_by ?? "system",
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  });

  return NextResponse.json({ schedules: mapped });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const { user, customerId } = await requireDashboardCustomer();

  const supabase = await createClient();
  const tenantContext = await resolveAuthorizedTenantContext(
    supabase,
    user.id,
    tenantId
  );

  if (!tenantContext || tenantContext.customerId !== customerId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createCustomScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Enforce custom schedule limit
  const { count, error: countError } = await admin
    .from("tenant_scheduled_messages")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantContext.tenantId)
    .eq("schedule_type", "custom");

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_CUSTOM_SCHEDULES) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_CUSTOM_SCHEDULES} custom schedules reached` },
      { status: 400 }
    );
  }

  // Verify agent belongs to this tenant
  const { data: agent, error: agentError } = await admin
    .from("tenant_agents")
    .select("id")
    .eq("id", parsed.data.agent_id)
    .eq("tenant_id", tenantContext.tenantId)
    .maybeSingle();

  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const scheduleKey = `custom_${crypto.randomUUID().slice(0, 8)}`;
  const nextRunAt = computeNextRun(
    parsed.data.cron_expression,
    parsed.data.timezone
  );

  const { data: created, error: insertError } = await admin
    .from("tenant_scheduled_messages")
    .insert({
      tenant_id: tenantContext.tenantId,
      customer_id: customerId,
      agent_id: parsed.data.agent_id,
      channel_id: parsed.data.channel_id,
      schedule_key: scheduleKey,
      cron_expression: parsed.data.cron_expression,
      timezone: parsed.data.timezone,
      enabled: true,
      next_run_at: nextRunAt,
      schedule_type: "custom",
      display_name: parsed.data.display_name,
      prompt: parsed.data.prompt,
      tools: parsed.data.tools || [],
      created_by: "dashboard",
    })
    .select("id, schedule_key, cron_expression, timezone, enabled, next_run_at, schedule_type, display_name, prompt, tools, created_by, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: created }, { status: 201 });
}
