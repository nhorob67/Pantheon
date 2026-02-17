import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { getCoolifyClient } from "@/lib/coolify/client";

export async function POST(
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
  const { data: instance } = await admin
    .from("instances")
    .select("coolify_uuid")
    .eq("id", id)
    .single();

  if (!instance?.coolify_uuid) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  const coolify = getCoolifyClient();
  await coolify.stopApplication(instance.coolify_uuid);

  await admin
    .from("instances")
    .update({ status: "stopped" })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
