import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { createUpgradeSchema } from "@/lib/validators/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: upgrades, error } = await admin
    .from("upgrade_operations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load upgrades") },
      { status: 500 }
    );
  }

  return NextResponse.json({ upgrades: upgrades || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUpgradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { target_version, docker_image, concurrency } = parsed.data;

  const admin = createAdminClient();

  // Get all running instances
  const { data: instances, error: instErr } = await admin
    .from("instances")
    .select("id")
    .eq("status", "running");

  if (instErr) {
    return NextResponse.json(
      { error: safeErrorMessage(instErr, "Failed to query instances") },
      { status: 500 }
    );
  }

  if (!instances || instances.length === 0) {
    return NextResponse.json(
      { error: "No running instances to upgrade" },
      { status: 400 }
    );
  }

  // Create upgrade operation
  const { data: upgrade, error: upErr } = await admin
    .from("upgrade_operations")
    .insert({
      target_version,
      docker_image,
      concurrency,
      total_instances: instances.length,
      initiated_by: user.email!,
      status: "pending",
    })
    .select()
    .single();

  if (upErr || !upgrade) {
    return NextResponse.json(
      { error: safeErrorMessage(upErr, "Failed to create upgrade") },
      { status: 500 }
    );
  }

  // Create instance logs
  const logs = instances.map((inst) => ({
    upgrade_id: upgrade.id,
    instance_id: inst.id,
    status: "pending",
  }));

  const { error: logErr } = await admin
    .from("upgrade_instance_logs")
    .insert(logs);

  if (logErr) {
    return NextResponse.json(
      { error: safeErrorMessage(logErr, "Failed to create upgrade logs") },
      { status: 500 }
    );
  }

  auditLog({
    action: "upgrade.create",
    actor: user.email!,
    resource_type: "upgrade",
    resource_id: upgrade.id,
    details: { target_version, docker_image, total_instances: instances.length },
  });

  return NextResponse.json({ upgrade });
}
