import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";

const updateSkillSchema = z.object({
  skill: z.string(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
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
  const parsed = updateSkillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Upsert skill config
  const upsertData: Record<string, unknown> = {
    customer_id: instance.customer_id,
    skill_name: parsed.data.skill,
    enabled: parsed.data.enabled,
  };
  if (parsed.data.config) {
    upsertData.config = parsed.data.config;
  }

  await admin.from("skill_configs").upsert(upsertData, {
    onConflict: "customer_id,skill_name",
  });

  if (!instance.coolify_uuid) {
    return NextResponse.json({ error: "No container" }, { status: 400 });
  }

  // Use rebuildAndDeploy to correctly handle both single-agent and multi-agent modes
  await rebuildAndDeploy(id);

  return NextResponse.json({ success: true });
}
