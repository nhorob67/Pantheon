import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { generateText, streamText } from "ai";
import { agentPreviewSchema, agentPreviewChatSchema } from "@/lib/validators/agent";
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

async function loadAgentAndTools(state: { admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>; tenantContext: { tenantId: string; customerId: string } }, agentId: string) {
  const { data: agentRow } = await state.admin
    .from("tenant_agents")
    .select("id, tenant_id, customer_id, legacy_agent_id, agent_key, display_name, status, policy_profile, is_default, sort_order, skills, config, created_at, updated_at")
    .eq("id", agentId)
    .eq("tenant_id", state.tenantContext.tenantId)
    .neq("status", "archived")
    .maybeSingle();

  if (!agentRow) return null;

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

  const systemPrompt = await buildSystemPrompt(state.admin, agent);

  const { data: teamProfile } = await state.admin
    .from("team_profiles")
    .select("timezone")
    .eq("customer_id", agent.customer_id)
    .maybeSingle();

  const toolResult = await resolveToolsForAgent({
    admin: state.admin,
    tenantId: state.tenantContext.tenantId,
    customerId: state.tenantContext.customerId,
    agent,
    timezone: teamProfile?.timezone ?? "America/Chicago",
    channelId: "preview",
  });

  return { agent, systemPrompt, tools: toolResult.tools };
}

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
      // Rate limit: 20 requests per 60 seconds for workspace chat
      const allowed = await consumeDurableRateLimit({
        action: "agent_preview",
        key: state.user.id,
        windowSeconds: 60,
        maxAttempts: 20,
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

      // Support both legacy single-message and new multi-turn format
      const chatParsed = agentPreviewChatSchema.safeParse(body);
      const legacyParsed = !chatParsed.success ? agentPreviewSchema.safeParse(body) : null;

      if (!chatParsed.success && (!legacyParsed || !legacyParsed.success)) {
        return NextResponse.json(
          { error: "Invalid data", details: chatParsed.error.flatten() },
          { status: 400 }
        );
      }

      const loaded = await loadAgentAndTools(state, parsedParams.data.agentId);
      if (!loaded) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      const { systemPrompt, tools } = loaded;
      const hasTools = Object.keys(tools).length > 0;
      const previewSuffix = "\n\n## Preview Mode\nThis is a preview/test conversation. Responses will NOT appear in Discord. Treat this as a normal interaction.";

      // Build messages array
      const messages = chatParsed.success
        ? chatParsed.data.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
        : [{ role: "user" as const, content: legacyParsed!.data!.message }];

      // Use real streaming for multi-turn chat requests
      if (chatParsed.success) {
        const result = streamText({
          model: pantheonModel,
          system: systemPrompt + previewSuffix,
          messages,
          ...(hasTools ? { tools, maxSteps: 3 } : {}),
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          temperature: AI_CONFIG.temperature,
          abortSignal: request.signal,
          onFinish: ({ usage }) => {
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
          },
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                );
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (err) {
              if (err instanceof Error && err.name === "AbortError") {
                // Client disconnected — clean close
              } else {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
                );
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // Legacy single-message path: generateText + fake chunking
      const result = await generateText({
        model: pantheonModel,
        system: systemPrompt + previewSuffix,
        messages,
        ...(hasTools ? { tools, maxSteps: 3 } : {}),
        maxOutputTokens: AI_CONFIG.maxOutputTokens,
        temperature: AI_CONFIG.temperature,
      });

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

      const text = result.text || "";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
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
