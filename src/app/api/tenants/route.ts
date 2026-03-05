import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createTenantSchema = z.object({
  farm_profile: z.object({
    farm_name: z.string().min(1),
    country: z.string().default("US"),
    state: z.string().min(1),
    county: z.string().optional(),
    business_type: z.string().optional(),
    primary_crops: z.array(z.string()).optional().default([]),
    acres: z.number().positive().nullable().optional(),
    elevators: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
          crops: z.array(z.string()),
        })
      )
      .optional()
      .default([]),
    weather_location: z.string(),
    weather_lat: z.number(),
    weather_lng: z.number(),
    timezone: z.string(),
  }),
  discord_guild_id: z.string().optional(),
  template_id: z.string().optional(),
});

function generateSlug(farmName: string): string {
  const base = farmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Look up customer
  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json(
      { error: "Customer account not found" },
      { status: 404 }
    );
  }

  const customerId = customer.id;
  const { farm_profile } = parsed.data;

  // Upsert farm profile
  const { error: profileError } = await admin.from("farm_profiles").upsert(
    {
      customer_id: customerId,
      farm_name: farm_profile.farm_name,
      country: farm_profile.country,
      state: farm_profile.state,
      county: farm_profile.county || null,
      business_type: farm_profile.business_type || null,
      primary_crops: farm_profile.primary_crops,
      acres: farm_profile.acres ?? null,
      elevators: farm_profile.elevators,
      weather_location: farm_profile.weather_location,
      weather_lat: farm_profile.weather_lat,
      weather_lng: farm_profile.weather_lng,
      timezone: farm_profile.timezone,
    },
    { onConflict: "customer_id" }
  );

  if (profileError) {
    return NextResponse.json(
      { error: "Failed to save farm profile" },
      { status: 500 }
    );
  }

  // Create tenant
  const slug = generateSlug(farm_profile.farm_name);
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      customer_id: customerId,
      slug,
      name: farm_profile.farm_name,
      status: "active",
      primary_channel_type: "discord",
    })
    .select("id, slug")
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }

  // Link instance if one exists
  const { data: instance } = await admin
    .from("instances")
    .select("id")
    .eq("customer_id", customerId)
    .limit(1)
    .maybeSingle();

  if (instance) {
    await admin.from("instance_tenant_mappings").insert({
      instance_id: instance.id,
      tenant_id: tenant.id,
      customer_id: customerId,
      mapping_source: "runtime",
      mapping_status: "active",
    });
  }

  // Add user as tenant owner
  await admin.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  return NextResponse.json({ tenant_id: tenant.id, slug: tenant.slug });
}
