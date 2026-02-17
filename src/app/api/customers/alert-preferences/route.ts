import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { alertPreferencesSchema } from "@/lib/validators/alerts";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data: prefs } = await supabase
    .from("alert_preferences")
    .select("*")
    .eq("customer_id", customer.id)
    .maybeSingle();

  // Return defaults if no prefs yet
  return NextResponse.json(
    prefs || {
      spending_alerts_enabled: true,
      spending_alert_email: true,
      spending_alert_dashboard: true,
      weather_severe_enabled: true,
      weather_severe_discord: true,
      price_movement_enabled: true,
      price_movement_threshold_cents: 10,
      price_movement_discord: true,
      ticket_anomaly_enabled: true,
      ticket_anomaly_discord: true,
    }
  );
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = alertPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  await admin.from("alert_preferences").upsert(
    {
      customer_id: customer.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_id" }
  );

  // Rebuild instance config to inject/remove alert cron jobs
  const { data: instance } = await admin
    .from("instances")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "running")
    .maybeSingle();

  if (instance) {
    try {
      await rebuildAndDeploy(instance.id);
    } catch {
      // Non-fatal: prefs are saved even if rebuild fails
    }
  }

  return NextResponse.json({ status: "ok" });
}
