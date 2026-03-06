import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { modelId } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("model_catalog")
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: user.email,
    })
    .eq("id", modelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
