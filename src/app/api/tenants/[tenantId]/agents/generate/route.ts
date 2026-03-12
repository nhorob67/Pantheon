import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { AGENT_GENERATION_SYSTEM_PROMPT } from "@/lib/ai/agent-generation-prompt";

const paramsSchema = z.object({
  tenantId: z.uuid(),
});

const bodySchema = z.object({
  description: z.string().min(10).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to generate agent",
    },
    async () => {
      const body = await request.json();
      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Provide a description (10-1000 chars)" },
          { status: 400 }
        );
      }

      const { description } = parsed.data;

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "AI generation not configured" },
          { status: 503 }
        );
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: AGENT_GENERATION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Generate agent configuration for: ${description}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "AI generation failed" },
          { status: 502 }
        );
      }

      const result = await response.json();
      const text =
        result.content?.[0]?.type === "text" ? result.content[0].text : "";

      try {
        const generated = JSON.parse(text);
        return NextResponse.json({ agent: generated });
      } catch {
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 502 }
        );
      }
    }
  );
}
