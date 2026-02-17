import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { auditLog } from "@/lib/security/audit";
import { workflowNLDraftRequestSchema } from "@/lib/validators/workflow";
import { generateWorkflowDraftFromNaturalLanguage } from "@/lib/workflows/nl-draft";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

function getCustomerUserId(
  customers: { user_id: string } | { user_id: string }[] | null
): string | null {
  if (!customers) {
    return null;
  }

  if (Array.isArray(customers)) {
    return customers[0]?.user_id ?? null;
  }

  return customers.user_id ?? null;
}

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

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    instance.customer_id
  );

  if (!workflowBuilderEnabled) {
    return NextResponse.json(
      { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedRequest = workflowNLDraftRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }

  const draft = generateWorkflowDraftFromNaturalLanguage({
    prompt: parsedRequest.data.prompt,
    name: parsedRequest.data.name,
    description: parsedRequest.data.description,
    preferredTrigger: parsedRequest.data.preferred_trigger,
    maxNodes: parsedRequest.data.max_nodes,
  });

  auditLog({
    action: "workflow.nl_draft.generate",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: id,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      detected_capabilities: draft.detected_capabilities,
      assumptions_count: draft.assumptions.length,
      warnings_count: draft.warnings.length,
      generated_node_count: draft.draft.graph.nodes.length,
      generated_edge_count: draft.draft.graph.edges.length,
    },
  });

  return NextResponse.json({
    draft: draft.draft,
    assumptions: draft.assumptions,
    warnings: draft.warnings,
    detected_capabilities: draft.detected_capabilities,
  });
}
