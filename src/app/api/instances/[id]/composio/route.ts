import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enableComposioSchema, updateComposioSchema } from "@/lib/validators/composio";
import { getComposioClient } from "@/lib/composio/client";
import { buildComposioUserId } from "@/lib/composio/user-id";
import { consumeComposioRateLimit } from "@/lib/security/user-rate-limit";

async function authorizeInstance(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401, user: null, instance: null };

  const { data: instance } = await supabase
    .from("instances")
    .select("*, customers!inner(user_id, id)")
    .eq("id", id)
    .single();

  if (!instance || instance.customers.user_id !== user.id) {
    return { error: "Not found", status: 404, user: null, instance: null };
  }

  return { error: null, status: 200, user, instance };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await authorizeInstance(id);
  if (error) return NextResponse.json({ error }, { status });

  const admin = createAdminClient();
  const { data: config } = await admin
    .from("composio_configs")
    .select("*")
    .eq("instance_id", id)
    .maybeSingle();

  return NextResponse.json({ config: config || null });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user, instance } = await authorizeInstance(id);
  if (error || !user || !instance) return NextResponse.json({ error }, { status });

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

  const body = await request.json();
  const parsed = enableComposioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const customerId = instance.customers.id as string;
  const composioUserId = buildComposioUserId(customerId);

  // Check if config already exists
  const { data: existing } = await admin
    .from("composio_configs")
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Composio integration already configured" },
      { status: 409 }
    );
  }

  // Create entity and provision MCP server via Composio API
  const composio = getComposioClient();
  await composio.createEntity(composioUserId);
  const mcpServer = await composio.getMcpUrl(composioUserId);

  const { data: config, error: insertError } = await admin
    .from("composio_configs")
    .insert({
      customer_id: customerId,
      instance_id: id,
      composio_user_id: composioUserId,
      enabled: true,
      mcp_server_url: mcpServer.url,
      composio_server_id: mcpServer.server_id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ config }, { status: 201 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await authorizeInstance(id);
  if (error || !user) return NextResponse.json({ error }, { status });

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

  const body = await request.json();
  const parsed = updateComposioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: config, error: updateError } = await admin
    .from("composio_configs")
    .update(parsed.data)
    .eq("instance_id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ config });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await authorizeInstance(id);
  if (error || !user) return NextResponse.json({ error }, { status });

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

  const admin = createAdminClient();
  const { error: deleteError } = await admin
    .from("composio_configs")
    .delete()
    .eq("instance_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
