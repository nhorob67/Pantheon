import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: models, error } = await admin
    .from("model_catalog")
    .select("*")
    .order("provider")
    .order("display_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count tenants using each model
  const { data: primaryCounts } = await admin
    .from("tenant_model_preferences")
    .select("primary_model_id");
  const { data: fastCounts } = await admin
    .from("tenant_model_preferences")
    .select("fast_model_id");

  const usageCounts: Record<string, number> = {};
  for (const row of primaryCounts || []) {
    if (row.primary_model_id) {
      usageCounts[row.primary_model_id] = (usageCounts[row.primary_model_id] || 0) + 1;
    }
  }
  for (const row of fastCounts || []) {
    if (row.fast_model_id) {
      usageCounts[row.fast_model_id] = (usageCounts[row.fast_model_id] || 0) + 1;
    }
  }

  const modelsWithCounts = (models || []).map((m) => ({
    ...m,
    tenant_count: usageCounts[m.id] || 0,
  }));

  return NextResponse.json({ models: modelsWithCounts });
}
