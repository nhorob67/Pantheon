import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { alertPreferencesSchema } from "@/lib/validators/alerts";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";

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

  const rateLimit = await consumeConfigUpdateRateLimit(user.id);
  if (rateLimit === "unavailable") {
    return NextResponse.json(
      { error: "Rate limiter unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
  if (rateLimit === "blocked") {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
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

  return NextResponse.json({ status: "ok" });
}
