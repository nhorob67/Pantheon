import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deprovisionInstance } from "@/lib/infra/deprovision";
import { auditLog } from "@/lib/security/audit";
import { consumeInstanceActionRateLimit } from "@/lib/security/user-rate-limit";

export async function POST(
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

  const rateLimit = await consumeInstanceActionRateLimit(user.id);
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

  // Verify ownership via RLS-respecting query
  const { data: instance } = await supabase
    .from("instances")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || instance.customers.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (instance.status === "deprovisioned" || instance.status === "deprovisioning") {
    return NextResponse.json(
      { error: `Instance is already ${instance.status}` },
      { status: 409 }
    );
  }

  const result = await deprovisionInstance(id);

  auditLog({
    action: "instance.deprovision",
    actor: user.id,
    resource_type: "instance",
    resource_id: id,
    details: { success: result.success },
  });

  if (result.success) {
    return NextResponse.json({ status: "deprovisioned", result });
  }

  // Partial failure — some cleanup steps succeeded, some failed
  return NextResponse.json(
    { status: "deprovision_error", result },
    { status: 207 }
  );
}
