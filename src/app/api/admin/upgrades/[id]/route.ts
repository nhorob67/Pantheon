import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: upgrade, error: upErr } = await admin
    .from("upgrade_operations")
    .select("*")
    .eq("id", id)
    .single();

  if (upErr || !upgrade) {
    return NextResponse.json({ error: "Upgrade not found" }, { status: 404 });
  }

  const { data: logs, error: logErr } = await admin
    .from("upgrade_instance_logs")
    .select("*, instances(id, coolify_uuid, customers(email))")
    .eq("upgrade_id", id)
    .order("created_at", { ascending: true });

  if (logErr) {
    return NextResponse.json(
      { error: safeErrorMessage(logErr, "Failed to load upgrade logs") },
      { status: 500 }
    );
  }

  return NextResponse.json({ upgrade, logs: logs || [] });
}
