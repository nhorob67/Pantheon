import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeConfigUpdateRateLimit(user.id);
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

  // Verify ownership
  const { data: skill } = await admin
    .from("custom_skills")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!skill || skill.customers.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (skill.status === "archived") {
    return NextResponse.json(
      { error: "Cannot rollback an archived skill" },
      { status: 400 }
    );
  }

  // Fetch the target version
  const { data: version } = await admin
    .from("custom_skill_versions")
    .select("*")
    .eq("id", versionId)
    .eq("skill_id", id)
    .single();

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Update skill with version's content
  const { data: updated, error } = await admin
    .from("custom_skills")
    .update({
      skill_md: version.skill_md,
      references: version.references || {},
      config: version.config || {},
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to rollback") },
      { status: 500 }
    );
  }

  // Create new version documenting the rollback
  const { data: latest } = await admin
    .from("custom_skill_versions")
    .select("version")
    .eq("skill_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version || 0) + 1;

  await admin.from("custom_skill_versions").insert({
    skill_id: id,
    version: nextVersion,
    skill_md: version.skill_md,
    references: version.references,
    config: version.config,
    change_summary: `Rolled back to version ${version.version}`,
  });

  return NextResponse.json({ skill: updated });
}
