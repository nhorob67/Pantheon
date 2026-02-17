import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomSkillSchema } from "@/lib/validators/custom-skill";
import { sanitizeSkillMd, sanitizeReferences, checkSkillLimit } from "@/lib/custom-skills/sanitizer";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data: skills } = await supabase
    .from("custom_skills")
    .select("*")
    .eq("customer_id", customer.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return NextResponse.json({ skills: skills || [] });
}

export async function POST(request: Request) {
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

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createCustomSkillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Check skill limit
  const limitError = await checkSkillLimit(async () => {
    const { count } = await admin
      .from("custom_skills")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .neq("status", "archived");
    return count || 0;
  });

  if (limitError) {
    return NextResponse.json({ error: limitError }, { status: 400 });
  }

  // Sanitize skill_md
  const mdResult = sanitizeSkillMd(data.skill_md, data.slug);
  if (!mdResult.valid) {
    return NextResponse.json({ error: mdResult.error }, { status: 400 });
  }

  // Sanitize references
  const refsResult = sanitizeReferences(data.references);
  if (!refsResult.valid) {
    return NextResponse.json({ error: refsResult.error }, { status: 400 });
  }

  // Check slug uniqueness
  const { data: existing } = await admin
    .from("custom_skills")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("slug", data.slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A skill with this slug already exists" },
      { status: 409 }
    );
  }

  // Insert skill
  const { data: skill, error } = await admin
    .from("custom_skills")
    .insert({
      customer_id: customer.id,
      slug: data.slug,
      display_name: data.display_name,
      description: data.description || null,
      icon: data.icon || "Puzzle",
      skill_md: mdResult.sanitized || data.skill_md,
      references: data.references || {},
      config_schema: data.config_schema || {},
      config: data.config || {},
      status: data.status || "draft",
      template_id: data.template_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to create skill") },
      { status: 500 }
    );
  }

  // Create version 1
  await admin.from("custom_skill_versions").insert({
    skill_id: skill.id,
    version: 1,
    skill_md: skill.skill_md,
    references: skill.references,
    config: skill.config,
    change_summary: "Initial version",
  });

  return NextResponse.json({ skill }, { status: 201 });
}
