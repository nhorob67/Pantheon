import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCustomSkillSchema } from "@/lib/validators/custom-skill";
import { sanitizeSkillMd, sanitizeReferences } from "@/lib/custom-skills/sanitizer";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";

async function getSkillWithAuth(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401 } as const;

  const admin = createAdminClient();
  const { data: skill } = await admin
    .from("custom_skills")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!skill || skill.customers.user_id !== user.id) {
    return { error: "Not found", status: 404 } as const;
  }

  return { skill, user, admin } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getSkillWithAuth(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { admin, skill } = result;

  // Fetch version history
  const { data: versions } = await admin
    .from("custom_skill_versions")
    .select("*")
    .eq("skill_id", skill.id)
    .order("version", { ascending: false });

  const { customers: _, ...skillWithoutJoin } = skill;

  return NextResponse.json({
    skill: skillWithoutJoin,
    versions: versions || [],
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getSkillWithAuth(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { skill, user, admin } = result;

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

  if (skill.status === "archived") {
    return NextResponse.json(
      { error: "Cannot update an archived skill" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = updateCustomSkillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Sanitize skill_md if provided
  if (data.skill_md) {
    const mdResult = sanitizeSkillMd(data.skill_md, skill.slug);
    if (!mdResult.valid) {
      return NextResponse.json({ error: mdResult.error }, { status: 400 });
    }
    data.skill_md = mdResult.sanitized || data.skill_md;
  }

  // Sanitize references if provided
  if (data.references) {
    const refsResult = sanitizeReferences(data.references);
    if (!refsResult.valid) {
      return NextResponse.json({ error: refsResult.error }, { status: 400 });
    }
  }

  const { change_summary, ...updateFields } = data;

  // Update skill
  const { data: updated, error } = await admin
    .from("custom_skills")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update skill") },
      { status: 500 }
    );
  }

  // Create new version if content changed
  if (data.skill_md || data.references || data.config) {
    // Get latest version number
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
      skill_md: updated.skill_md,
      references: updated.references,
      config: updated.config,
      change_summary: change_summary || null,
    });
  }

  return NextResponse.json({ skill: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getSkillWithAuth(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { skill, user, admin } = result;

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

  const wasActive = skill.status === "active";

  // Archive the skill
  await admin
    .from("custom_skills")
    .update({ status: "archived" })
    .eq("id", id);

  // Remove from all agents
  if (wasActive) {
    const { data: agents } = await admin
      .from("agents")
      .select("id, skills")
      .eq("customer_id", skill.customer_id);

    if (agents) {
      for (const agent of agents) {
        if (agent.skills.includes(skill.slug)) {
          await admin
            .from("agents")
            .update({
              skills: agent.skills.filter((s: string) => s !== skill.slug),
            })
            .eq("id", agent.id);
        }
      }
    }

  }

  return NextResponse.json({ success: true });
}
