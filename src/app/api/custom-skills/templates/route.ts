import { NextResponse } from "next/server";
import { SKILL_TEMPLATES } from "@/lib/custom-skills/templates";

export async function GET() {
  return NextResponse.json({ templates: SKILL_TEMPLATES });
}
