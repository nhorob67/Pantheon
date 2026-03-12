import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { generateText } from "ai";
import { agentPreviewSchema } from "@/lib/validators/agent";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { resolveToolsForAgent } from "@/lib/ai/tools/registry";
import { pantheonModel, AI_CONFIG } from "@/lib/ai/client";

const previewRouteParamsSchema = z.object({
  tenantId: z.uuid(),
  agentId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: previewRouteParamsSchema,
    errorMessage: "Invalid tenant or agent ID",
  });
  if (parsedParams instanceof Response) {
    return parsedParams;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      roleErrorMessage: "Insufficient role for agent preview",
      fallbackErrorMessage: "Failed to run agent preview",
    },
    async (state) => {
      // Rate limit: 5 requests per 60 seconds per user
      const allowed = await consumeDurableRateLimit({
        action: "agent_preview",
        key: state.user.id,
        windowSeconds: 60,
        maxAttempts: 5,
      }).catch(() => null);

      if (allowed === null) {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
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
      const parsed = agentPreviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      // Load agent
      const { data: agentRow } = await state.admin
        .from("tenant_agents")
        .select("id, tenant_id, customer_id, legacy_agent_id, agent_key, display_name, status, policy_profile, is_default, sort_order, skills, config, created_at, updated_at")
        .eq("id", parsedParams.data.agentId)
        .eq("tenant_id", state.tenantContext.tenantId)
        .neq("status", "archived")
        .maybeSingle();

      if (!agentRow) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      const agent = {
        id: agentRow.id,
        tenant_id: agentRow.tenant_id,
        customer_id: agentRow.customer_id,
        legacy_agent_id: agentRow.legacy_agent_id,
        agent_key: agentRow.agent_key,
        display_name: agentRow.display_name,
        status: agentRow.status as "active" | "paused" | "archived",
        policy_profile: agentRow.policy_profile as "safe" | "normal" | "unsafe",
        is_default: agentRow.is_default,
        sort_order: agentRow.sort_order,
        skills: agentRow.skills as string[],
        config: (agentRow.config || {}) as Record<string, unknown>,
        created_at: agentRow.created_at,
        updated_at: agentRow.updated_at,
      };

      // Build system prompt and resolve tools
      const systemPrompt = await buildSystemPrompt(state.admin, agent);

      // Resolve timezone from team profile
      const { data: teamProfile } = await state.admin
        .from("team_profiles")
        .select("timezone")
        .eq("customer_id", agent.customer_id)
        .maybeSingle();

      const tools = await resolveToolsForAgent({
        admin: state.admin,
        tenantId: state.tenantContext.tenantId,
        customerId: state.tenantContext.customerId,
        agent,
        timezone: teamProfile?.timezone ?? "America/Chicago",
        channelId: "preview",
      });

      const hasTools = Object.keys(tools).length > 0;

      const result = await generateText({
        model: pantheonModel,
        system: systemPrompt + "\n\n## Preview Mode\nThis is a preview/test conversation. Responses will NOT appear in Discord. Treat this as a normal interaction.",
        messages: [{ role: "user" as const, content: parsed.data.message }],
        ...(hasTools ? { tools, maxSteps: 3 } : {}),
        maxOutputTokens: AI_CONFIG.maxOutputTokens,
        temperature: AI_CONFIG.temperature,
      });

      // Record usage (fire-and-forget)
      const usage = result.usage;
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        const today = new Date().toISOString().split("T")[0];
        Promise.resolve(
          state.admin.rpc("increment_api_usage", {
            p_customer_id: state.tenantContext.customerId,
            p_date: today,
            p_model: "anthropic/claude-sonnet-4-5",
            p_input_tokens: usage.inputTokens || 0,
            p_output_tokens: usage.outputTokens || 0,
          })
        ).catch(() => {});
      }

      // Stream the response text as SSE for consistent client parsing
      const text = result.text || "";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send in chunks to feel streaming
          const chunkSize = 20;
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
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
  );
}
