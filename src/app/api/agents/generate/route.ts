import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { pantheonFastModel } from "@/lib/ai/client";
import { AGENT_GENERATION_SYSTEM_PROMPT } from "@/lib/ai/agent-generation-prompt";

const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS = 10;

const bodySchema = z.object({
  description: z.string().min(10).max(1000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await consumeDurableRateLimit({
    action: "agent_generate",
    key: user.id,
    windowSeconds: WINDOW_SECONDS,
    maxAttempts: MAX_ATTEMPTS,
  }).catch(() => null);

  if (allowed === null) {
    return NextResponse.json(
      { error: "Rate limiter unavailable" },
      { status: 503 }
    );
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a description (10-1000 chars)" },
      { status: 400 }
    );
  }

  try {
    const result = await generateText({
      model: pantheonFastModel,
      system: AGENT_GENERATION_SYSTEM_PROMPT,
      prompt: `Generate agent configuration for: ${parsed.data.description}`,
      maxOutputTokens: 512,
    });

    // Strip markdown code fences if present
    let jsonText = result.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    const generated = JSON.parse(jsonText);
    return NextResponse.json({ agent: generated });
  } catch (err) {
    console.error("[agent-generate]", err);
    return NextResponse.json(
      { error: "Failed to generate agent configuration" },
      { status: 502 }
    );
  }
}
