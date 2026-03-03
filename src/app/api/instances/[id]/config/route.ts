import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { farmProfileSchema } from "@/lib/validators/farm-profile";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: instance } = await supabase
    .from("instances")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || instance.customers.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Read and validate request body
  const body = await request.json();
  const parsed = farmProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Update farm profile in DB
  await admin
    .from("farm_profiles")
    .update({
      farm_name: parsed.data.farm_name,
      state: parsed.data.state,
      county: parsed.data.county,
      primary_crops: parsed.data.primary_crops,
      acres: parsed.data.acres,
    })
    .eq("customer_id", instance.customer_id);

  // Fetch updated profile (includes fields not in form like weather, elevators)
  const { data: profile } = await admin
    .from("farm_profiles")
    .select("id, customer_id, farm_name, state, county, primary_crops, acres, elevators, elevator_urls, weather_location, weather_lat, weather_lng, timezone, created_at, updated_at")
    .eq("customer_id", instance.customer_id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Farm profile not found" },
      { status: 404 }
    );
  }

  // TODO: In multi-tenant SaaS model, config updates are applied via the
  // tenant runtime layer (system prompts from soul-presets, skill configs
  // from DB) rather than pushing env vars to a Coolify container.

  return NextResponse.json({ success: true });
}
