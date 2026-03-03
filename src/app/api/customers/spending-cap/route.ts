import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { spendingCapSchema } from "@/lib/validators/alerts";
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
    .select(
      "id, spending_cap_cents, spending_cap_auto_pause, alert_email, spending_paused_at"
    )
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Get current month usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: usage } = await supabase
    .from("api_usage")
    .select("date, estimated_cost_cents")
    .eq("customer_id", customer.id)
    .gte("date", startOfMonth.toISOString().split("T")[0]);

  const currentCents = (usage || []).reduce(
    (sum, u) => sum + (u.estimated_cost_cents || 0),
    0
  );

  const daysElapsed = new Date().getDate();
  const dailyAvg = daysElapsed > 0 ? Math.round(currentCents / daysElapsed) : 0;

  return NextResponse.json({
    spending_cap_cents: customer.spending_cap_cents,
    spending_cap_auto_pause: customer.spending_cap_auto_pause,
    alert_email: customer.alert_email,
    spending_paused_at: customer.spending_paused_at,
    current_cents: currentCents,
    daily_average_cents: dailyAvg,
    percentage:
      customer.spending_cap_cents && customer.spending_cap_cents > 0
        ? Math.round((currentCents / customer.spending_cap_cents) * 100)
        : null,
  });
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
  const parsed = spendingCapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id, spending_paused_at")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {
    spending_cap_cents: parsed.data.spending_cap_cents,
    spending_cap_auto_pause: parsed.data.spending_cap_auto_pause,
    alert_email: parsed.data.alert_email,
  };

  // Unpause if new cap exceeds current usage
  if (customer.spending_paused_at && parsed.data.spending_cap_cents) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usage } = await supabase
      .from("api_usage")
      .select("estimated_cost_cents")
      .eq("customer_id", customer.id)
      .gte("date", startOfMonth.toISOString().split("T")[0]);

    const currentCents = (usage || []).reduce(
      (sum, u) => sum + (u.estimated_cost_cents || 0),
      0
    );

    if (currentCents < parsed.data.spending_cap_cents) {
      updateData.spending_paused_at = null;
    }
  }

  const { error } = await admin
    .from("customers")
    .update(updateData)
    .eq("id", customer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
