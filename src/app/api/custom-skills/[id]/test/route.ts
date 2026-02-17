import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { testSkillSchema } from "@/lib/validators/custom-skill";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";

const SKILL_TEST_WINDOW_SECONDS = 60;
const SKILL_TEST_MAX_ATTEMPTS = 5;

export async function POST(
  request: Request,
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

  const testAllowed = await consumeDurableRateLimit({
    action: "skill_test_user",
    key: user.id,
    windowSeconds: SKILL_TEST_WINDOW_SECONDS,
    maxAttempts: SKILL_TEST_MAX_ATTEMPTS,
  }).catch(() => null);

  if (testAllowed === null) {
    return NextResponse.json(
      { error: "Rate limiter unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (!testAllowed) {
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

  const body = await request.json();
  const parsed = testSkillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { message } = parsed.data;

  // Simulated preview: send the skill instructions + test message to OpenRouter
  const systemPrompt = `You are a farm assistant with the following skill enabled. Follow the skill's instructions to respond to the user's message.

SKILL INSTRUCTIONS:
${skill.skill_md}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://farmclaw.com",
      "X-Title": "FarmClaw Skill Test",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      stream: true,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[SKILL_TEST] OpenRouter error:", errText);
    return NextResponse.json(
      { error: "Test failed — AI provider error" },
      { status: 502 }
    );
  }

  // Forward stream
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
              // skip
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
            // Non-critical
          }
        }
      } catch (err) {
        console.error("[SKILL_TEST] Stream error:", err);
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
