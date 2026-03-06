import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { adminUpdateModelSchema } from "@/lib/validators/model-preferences";

export async function PUT(
  request: Request,
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
  const body = await request.json();
  const parsed = adminUpdateModelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (parsed.data.tier_hint !== undefined) {
    updates.tier_hint = parsed.data.tier_hint;
  }
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await admin
    .from("model_catalog")
    .update(updates)
    .eq("id", modelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
