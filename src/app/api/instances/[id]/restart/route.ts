import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoolifyClient } from "@/lib/coolify/client";
import { consumeInstanceActionRateLimit } from "@/lib/security/user-rate-limit";

export async function POST(
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

  const rateLimit = await consumeInstanceActionRateLimit(user.id);
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

  if (!instance.coolify_uuid) {
    return NextResponse.json({ error: "No container" }, { status: 400 });
  }

  const coolify = getCoolifyClient();
  await coolify.restartApplication(instance.coolify_uuid);

  const admin = createAdminClient();
  await admin
    .from("instances")
    .update({ status: "running" })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
