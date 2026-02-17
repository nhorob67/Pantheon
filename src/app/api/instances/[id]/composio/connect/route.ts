import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { composioOAuthInitSchema } from "@/lib/validators/composio";
import { getComposioClient } from "@/lib/composio/client";
import { consumeComposioRateLimit } from "@/lib/security/user-rate-limit";

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

  const rateLimit = await consumeComposioRateLimit(user.id);
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

  const body = await request.json();
  const parsed = composioOAuthInitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: config } = await admin
    .from("composio_configs")
    .select("composio_user_id, enabled")
    .eq("instance_id", id)
    .single();

  if (!config || !config.enabled) {
    return NextResponse.json(
      { error: "Composio integration not enabled" },
      { status: 400 }
    );
  }

  const composio = getComposioClient();
  const origin = new URL(request.url).origin;
  const redirectUrl =
    parsed.data.redirect_url ||
    `${origin}/api/instances/${id}/composio/callback`;

  const result = await composio.initiateOAuthConnection(
    config.composio_user_id,
    parsed.data.app_id,
    redirectUrl
  );

  return NextResponse.json({ redirect_url: result.redirect_url });
}
