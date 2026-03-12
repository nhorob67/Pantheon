import { NextResponse } from "next/server";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSkillSchema } from "@/lib/validators/custom-skill";
import { getTemplateById } from "@/lib/custom-skills/templates";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { pantheonModel, DEFAULT_PRIMARY_MODEL_ID } from "@/lib/ai/client";
import { recordTokenUsage } from "@/lib/ai/usage-tracker";

const SKILL_GENERATE_WINDOW_SECONDS = 60;
const SKILL_GENERATE_MAX_ATTEMPTS = 5;

const SYSTEM_PROMPT = `You are an expert at writing SKILL.md files for a multi-agent AI platform called Pantheon.

A SKILL.md file has this format:
1. YAML frontmatter between --- delimiters
2. Markdown body with instructions

The YAML frontmatter supports these fields ONLY:
- name: (required) The skill slug, must start with "custom-"
- description: A one-line description
- user-invocable: true/false (whether the user can directly invoke this skill)
- disable-model-invocation: true/false (optional)
- metadata.openclaw.requires.config: list of required config keys (optional)
- metadata.openclaw.emoji: display emoji (optional)

NEVER include these dangerous keys:
- metadata.openclaw.install
- metadata.openclaw.requires.bins

The markdown body contains:
- Purpose section explaining what the skill does
- Detailed instructions for the AI assistant on how to perform the skill
- Data formats, templates, and examples
- Any reference data the assistant needs

Guidelines:
- Write clear, specific instructions that an AI can follow
- Include example output formats using code blocks
- Keep instructions practical and actionable
- Do NOT include any script execution or package installation instructions
- Focus on prompt-based instructions the AI can follow using built-in tools (read, write, web_search, web_fetch, browser, exec)`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generateAllowed = await consumeDurableRateLimit({
    action: "skill_generate_user",
    key: user.id,
    windowSeconds: SKILL_GENERATE_WINDOW_SECONDS,
    maxAttempts: SKILL_GENERATE_MAX_ATTEMPTS,
  }).catch(() => null);

  if (generateAllowed === null) {
    return NextResponse.json(
      { error: "Rate limiter unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (!generateAllowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = generateSkillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prompt, template_id, team_context } = parsed.data;

  // Look up customer (used for team context and usage tracking)
  const { data: customer } = await supabase
    .from("customers")
    .select("id, tenant_id")
    .eq("user_id", user.id)
    .single();

  // Build context
  let teamContextStr = "";
  if (team_context && customer) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("team_profiles")
      .select("team_name, team_goal, industry, timezone")
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (profile) {
      teamContextStr = `\n\nTeam Context (use this to personalize the skill):
- Team: ${profile.team_name}
- Goal: ${profile.team_goal || "General assistance"}
- Industry: ${profile.industry || "Not specified"}
- Timezone: ${profile.timezone}`;
    }
  }

  let templateContext = "";
  if (template_id) {
    const template = getTemplateById(template_id);
    if (template) {
      templateContext = `\n\nBase this on the following template (adapt and expand it based on the user's request):\n\`\`\`\n${template.starter_skill_md}\n\`\`\``;
    }
  }

  const userMessage = `Create a SKILL.md file for this request:\n\n${prompt}${teamContextStr}${templateContext}

Generate ONLY the SKILL.md content (YAML frontmatter + markdown body). Use "custom-" prefix for the name field.`;

  const result = streamText({
    model: pantheonModel,
    system: SYSTEM_PROMPT,
    prompt: userMessage,
    maxOutputTokens: 8000,
    onError: ({ error }) => {
      console.error("[SKILL_GENERATE] Stream error:", error);
    },
    onFinish: async ({ usage }) => {
      if (customer?.tenant_id && (usage.inputTokens ?? 0) > 0) {
        const admin = createAdminClient();
        await recordTokenUsage(admin, {
          tenantId: customer.tenant_id,
          customerId: customer.id,
          model: DEFAULT_PRIMARY_MODEL_ID,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
        }).catch((err) => {
          console.error("[SKILL_GENERATE] Usage tracking failed:", err);
        });
      }
    },
  });

  return result.toTextStreamResponse();
}
