import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateMcpServerSchema } from "@/lib/validators/mcp-server";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; serverId: string }> }
) {
  const { id, serverId } = await params;
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

  const body = await request.json();
  const parsed = updateMcpServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: mcpServer, error } = await admin
    .from("mcp_server_configs")
    .update(parsed.data)
    .eq("id", serverId)
    .eq("instance_id", id)
    .select()
    .single();

  if (error || !mcpServer) {
    return NextResponse.json(
      { error: error?.message || "MCP server not found" },
      { status: error ? 500 : 404 }
    );
  }

  try {
    await rebuildAndDeploy(id);
  } catch {
    // Updated but deploy failed — not fatal
  }

  return NextResponse.json({ mcp_server: mcpServer });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; serverId: string }> }
) {
  const { id, serverId } = await params;
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

  const { error } = await admin
    .from("mcp_server_configs")
    .delete()
    .eq("id", serverId)
    .eq("instance_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await rebuildAndDeploy(id);
  } catch {
    // Deleted but deploy failed — not fatal
  }

  return NextResponse.json({ success: true });
}
