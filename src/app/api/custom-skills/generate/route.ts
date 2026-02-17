import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSkillSchema } from "@/lib/validators/custom-skill";
import { getTemplateById } from "@/lib/custom-skills/templates";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";

const SKILL_GENERATE_WINDOW_SECONDS = 60;
const SKILL_GENERATE_MAX_ATTEMPTS = 5;

const SYSTEM_PROMPT = `You are an expert at writing OpenClaw SKILL.md files for an agricultural AI assistant platform called FarmClaw.

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
- Use agricultural terminology appropriate for Upper Midwest row crop farmers
- Keep instructions practical and actionable
- The skill will be used by farmers in ND, SD, MN, MT, IA, NE
- Common crops: Corn, Soybeans, Spring Wheat, Winter Wheat, Durum, Barley, Sunflowers, Canola
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

  const { prompt, template_id, farm_context } = parsed.data;

  // Build context
  let farmContextStr = "";
  if (farm_context) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (customer) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("farm_profiles")
        .select("farm_name, state, county, primary_crops, acres, elevators, timezone")
        .eq("customer_id", customer.id)
        .single();

      if (profile) {
        farmContextStr = `\n\nFarm Context (use this to personalize the skill):
- Farm: ${profile.farm_name}
- Location: ${profile.county || ""}, ${profile.state}
- Crops: ${profile.primary_crops.join(", ")}
- Acres: ${profile.acres || "unknown"}
- Elevators: ${profile.elevators.join(", ")}
- Timezone: ${profile.timezone}`;
      }
    }
  }

  let templateContext = "";
  if (template_id) {
    const template = getTemplateById(template_id);
    if (template) {
      templateContext = `\n\nBase this on the following template (adapt and expand it based on the user's request):\n\`\`\`\n${template.starter_skill_md}\n\`\`\``;
    }
  }

  const userMessage = `Create a SKILL.md file for this request:\n\n${prompt}${farmContextStr}${templateContext}

Generate ONLY the SKILL.md content (YAML frontmatter + markdown body). Use "custom-" prefix for the name field.`;

  // Stream from OpenRouter
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://farmclaw.com",
      "X-Title": "FarmClaw Skill Forge",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      stream: true,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[SKILL_GENERATE] OpenRouter error:", errText);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 502 }
    );
  }

  // Forward the SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let totalTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
              if (json.usage) {
                totalTokens = json.usage.total_tokens || 0;
              }
            } catch {
              // skip unparseable chunks
            }
          }
        }

        // Record usage
        if (totalTokens > 0) {
          try {
            const { data: customer } = await supabase
              .from("customers")
              .select("id")
              .eq("user_id", user.id)
              .single();

            if (customer) {
              const admin = createAdminClient();
              const today = new Date().toISOString().split("T")[0];
              await admin.rpc("increment_api_usage", {
                p_customer_id: customer.id,
                p_date: today,
                p_model: "anthropic/claude-sonnet-4-5",
                p_input_tokens: Math.floor(totalTokens * 0.7),
                p_output_tokens: Math.floor(totalTokens * 0.3),
              });
            }
          } catch {
            // Non-critical: usage tracking failure
          }
        }
      } catch (err) {
        console.error("[SKILL_GENERATE] Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
