import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { updateInstanceMemorySettingsSchema } from "@/lib/validators/memory";
import { buildDefaultMemorySettings } from "@/types/memory";

const MEMORY_SETTINGS_SELECT =
  "instance_id, customer_id, mode, capture_level, retention_days, exclude_categories, auto_checkpoint, auto_compress, updated_by, created_at, updated_at";

function getCustomerUserId(
  customers: { user_id: string } | { user_id: string }[] | null
): string | null {
  if (!customers) {
    return null;
  }

  if (Array.isArray(customers)) {
    return customers[0]?.user_id ?? null;
  }

  return customers.user_id ?? null;
}

async function loadOwnedInstance(instanceId: string, userId: string) {
  const supabase = await createClient();
  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, coolify_uuid, customers!inner(user_id)")
    .eq("id", instanceId)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== userId) {
    return null;
  }

  return instance;
}

export async function GET(
  _request: Request,
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

  const instance = await loadOwnedInstance(id, user.id);

  if (!instance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: settings, error } = await admin
    .from("instance_memory_settings")
    .select(MEMORY_SETTINGS_SELECT)
    .eq("instance_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (settings) {
    return NextResponse.json({ settings, source: "stored" });
  }

  return NextResponse.json({
    settings: buildDefaultMemorySettings(id, instance.customer_id),
    source: "default",
  });
}

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

  const instance = await loadOwnedInstance(id, user.id);

  if (!instance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateInstanceMemorySettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: settings, error } = await admin
    .from("instance_memory_settings")
    .upsert(
      {
        instance_id: id,
        customer_id: instance.customer_id,
        ...parsed.data,
        updated_by: user.email || user.id,
      },
      { onConflict: "instance_id" }
    )
    .select(MEMORY_SETTINGS_SELECT)
    .single();

  if (error || !settings) {
    return NextResponse.json(
      { error: error?.message || "Failed to save memory settings" },
      { status: 500 }
    );
  }

  const rebuild = {
    attempted: !!instance.coolify_uuid,
    succeeded: false,
  };

  if (instance.coolify_uuid) {
    try {
      await rebuildAndDeploy(id);
      rebuild.succeeded = true;
    } catch {
      rebuild.succeeded = false;
    }
  }

  return NextResponse.json({ settings, rebuild });
}
