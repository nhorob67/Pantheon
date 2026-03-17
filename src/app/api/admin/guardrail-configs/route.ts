import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

async function hasAdminAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdmin(user?.email);
}

// GET /api/admin/guardrail-configs?tenant_id=xxx — list budget overrides
export async function GET(request: Request) {
  const authorized = await hasAdminAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) {
    return NextResponse.json(
      { error: "tenant_id is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_run_budget_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("agent_id", { ascending: true, nullsFirst: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/admin/guardrail-configs — upsert a budget override
export async function POST(request: Request) {
  const authorized = await hasAdminAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { tenant_id, customer_id, agent_id, ...configFields } = body;

  if (!tenant_id || !customer_id) {
    return NextResponse.json(
      { error: "tenant_id and customer_id are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_run_budget_configs")
    .upsert(
      {
        tenant_id,
        customer_id,
        agent_id: agent_id ?? null,
        ...configFields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,agent_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
