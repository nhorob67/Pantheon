import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMcpServerSchema } from "@/lib/validators/mcp-server";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";

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
  const { data: mcpServers } = await admin
    .from("mcp_server_configs")
    .select("id, instance_id, customer_id, server_key, display_name, command, args, env, scope, enabled, created_at, updated_at")
    .eq("instance_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ mcp_servers: mcpServers || [] });
}

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

  const body = await request.json();
  const parsed = createMcpServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: mcpServer, error } = await admin
    .from("mcp_server_configs")
    .insert({
      instance_id: id,
      customer_id: instance.customer_id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A server with this key already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Rebuild config and restart container
  try {
    await rebuildAndDeploy(id);
  } catch {
    // Server was created, but deploy failed — not fatal
  }

  return NextResponse.json({ mcp_server: mcpServer }, { status: 201 });
}
