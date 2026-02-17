import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { auditLog } from "@/lib/security/audit";

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

  // Set remaining pending logs to skipped
  await admin
    .from("upgrade_instance_logs")
    .update({
      status: "skipped",
      completed_at: new Date().toISOString(),
    })
    .eq("upgrade_id", id)
    .eq("status", "pending");

  // Set operation to canceled
  await admin
    .from("upgrade_operations")
    .update({
      status: "canceled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  auditLog({
    action: "upgrade.cancel",
    actor: user.email!,
    resource_type: "upgrade",
    resource_id: id,
  });

  return NextResponse.json({ success: true });
}
