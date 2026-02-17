import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";

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

  const { data: customer, error } = await admin
    .from("customers")
    .select(
      "*, farm_profiles(*), instances(*), skill_configs(*)"
    )
    .eq("id", id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Fetch usage summary for this customer
  const { data: usage } = await admin
    .from("api_usage")
    .select("*")
    .eq("customer_id", id)
    .order("date", { ascending: false })
    .limit(30);

  return NextResponse.json({ customer, usage: usage || [] });
}
