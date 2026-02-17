import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCoolifyClient } from "@/lib/coolify/client";
import { getHetznerClient } from "@/lib/hetzner/client";

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

  const { data: instance } = await supabase
    .from("instances")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || instance.customers.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let resolvedStatus = instance.status;

  // Check Hetzner action progress for servers still being provisioned
  if (
    (instance.status === "provisioning_server" ||
      instance.status === "provisioning") &&
    instance.hetzner_action_id
  ) {
    try {
      const hetzner = getHetznerClient();
      const action = await hetzner.getAction(instance.hetzner_action_id);
      if (action.status === "success") {
        resolvedStatus = "provisioning_coolify";
      } else if (action.status === "error") {
        resolvedStatus = "error";
      } else {
        resolvedStatus = "provisioning_server";
      }
    } catch {
      // Fall back to DB status
    }
  } else if (instance.coolify_uuid) {
    // Check Coolify app status for running instances
    try {
      const coolify = getCoolifyClient();
      const app = await coolify.getApplication(instance.coolify_uuid);
      resolvedStatus = app.status === "running" ? "running" : app.status;
    } catch {
      // Fall back to DB status
    }
  }

  const uptimeSeconds = instance.last_health_check
    ? Math.floor(
        (Date.now() - new Date(instance.last_health_check).getTime()) / 1000
      )
    : null;

  // Query real messages today from conversation_events
  const today = new Date().toISOString().split("T")[0];
  const { data: todayEvents } = await supabase
    .from("conversation_events")
    .select("message_count")
    .eq("instance_id", id)
    .eq("date", today);

  const messagesToday = (todayEvents || []).reduce(
    (sum, e) => sum + (e.message_count || 0),
    0
  );

  return NextResponse.json({
    id: instance.id,
    status: resolvedStatus,
    uptime_seconds: uptimeSeconds,
    last_health_check: instance.last_health_check,
    channel_type: instance.channel_type,
    openclaw_version: instance.openclaw_version,
    messages_today: messagesToday,
  });
}
