import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getComposioClient } from "@/lib/composio/client";
import { consumeComposioRateLimit } from "@/lib/security/user-rate-limit";
import type { ComposioConnectedApp } from "@/types/composio";

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

  const admin = createAdminClient();
  const { data: config } = await admin
    .from("composio_configs")
    .select("composio_user_id, connected_apps")
    .eq("instance_id", id)
    .maybeSingle();

  if (!config) {
    return NextResponse.json({ connections: [] });
  }

  // Sync from Composio to get fresh status
  const composio = getComposioClient();
  const accounts = await composio.getConnectedAccounts(config.composio_user_id);

  const connectedApps: ComposioConnectedApp[] = accounts.map((a) => ({
    id: a.id,
    app_id: a.app_id,
    app_name: a.app_name,
    status: a.status === "ACTIVE" ? "connected" : "disconnected",
    account_identifier: a.account_identifier,
    connected_at: a.created_at,
  }));

  // Update cached status
  await admin
    .from("composio_configs")
    .update({
      connected_apps: connectedApps,
      last_sync_at: new Date().toISOString(),
    })
    .eq("instance_id", id);

  return NextResponse.json({ connections: connectedApps });
}

export async function DELETE(
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

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connection_id");

  if (!connectionId) {
    return NextResponse.json(
      { error: "connection_id is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: config } = await admin
    .from("composio_configs")
    .select("composio_user_id")
    .eq("instance_id", id)
    .single();

  if (!config) {
    return NextResponse.json(
      { error: "Composio integration not enabled" },
      { status: 404 }
    );
  }

  const composio = getComposioClient();
  const existingAccounts = await composio.getConnectedAccounts(config.composio_user_id);
  const ownsConnection = existingAccounts.some((account) => account.id === connectionId);

  if (!ownsConnection) {
    return NextResponse.json(
      { error: "Composio connection not found" },
      { status: 404 }
    );
  }

  await composio.disconnectApp(connectionId);

  const accounts = await composio.getConnectedAccounts(config.composio_user_id);
  const connectedApps: ComposioConnectedApp[] = accounts.map((a) => ({
    id: a.id,
    app_id: a.app_id,
    app_name: a.app_name,
    status: a.status === "ACTIVE" ? "connected" : "disconnected",
    account_identifier: a.account_identifier,
    connected_at: a.created_at,
  }));

  await admin
    .from("composio_configs")
    .update({
      connected_apps: connectedApps,
      last_sync_at: new Date().toISOString(),
    })
    .eq("instance_id", id);

  return NextResponse.json({ success: true });
}
