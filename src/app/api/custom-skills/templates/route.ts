import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SKILL_TEMPLATES } from "@/lib/custom-skills/templates";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ templates: SKILL_TEMPLATES });
}
