import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { workflowPromotionRequestSchema } from "@/lib/validators/workflow";
import {
  getWorkflowPromotionState,
  promoteWorkflowEnvironment,
  resolvePromotionReadiness,
  resolvePromotionSummary,
} from "@/lib/workflows/promotions";
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

async function getAuthorizedInstance(
  instanceId: string
): Promise<
  | {
      user: { id: string; email?: string | null };
      instance: {
        id: string;
        customer_id: string;
        customers: { user_id: string } | { user_id: string }[] | null;
      };
    }
  | { error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", instanceId)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return { error: "Not found", status: 404 };
  }

  return {
    user,
    instance,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id, workflowId } = await params;
  const authResult = await getAuthorizedInstance(id);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    authResult.instance.customer_id
  );

  if (!workflowBuilderEnabled) {
    return NextResponse.json(
      { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  const { data: workflow } = await admin
    .from("workflow_definitions")
    .select("id")
    .eq("id", workflowId)
    .eq("instance_id", id)
    .eq("customer_id", authResult.instance.customer_id)
    .maybeSingle();

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  try {
    const state = await getWorkflowPromotionState(
      admin,
      id,
      authResult.instance.customer_id,
      workflowId
    );

    return NextResponse.json({
      state,
      summary: resolvePromotionSummary(state),
      readiness: resolvePromotionReadiness(state),
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load workflow promotion state") },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id, workflowId } = await params;
  const authResult = await getAuthorizedInstance(id);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const rateLimit = await consumeConfigUpdateRateLimit(authResult.user.id);
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

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    authResult.instance.customer_id
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

  const parsedRequest = workflowPromotionRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await promoteWorkflowEnvironment({
      admin,
      instanceId: id,
      customerId: authResult.instance.customer_id,
      workflowId,
      targetEnvironment: parsedRequest.data.target_environment,
      sourceVersion: parsedRequest.data.source_version,
      note: parsedRequest.data.note,
      metadata: parsedRequest.data.metadata,
      actorId: authResult.user.id,
    });

    auditLog({
      action: "workflow.environment.promote",
      actor: authResult.user.email || authResult.user.id,
      resource_type: "workflow",
      resource_id: workflowId,
      details: {
        customer_id: authResult.instance.customer_id,
        instance_id: id,
        target_environment: parsedRequest.data.target_environment,
        promoted_version: result.promoted_version.version,
        source_environment: result.promoted_version.source_environment,
      },
    });

    return NextResponse.json({
      promoted_version: result.promoted_version,
      event: result.event,
      state: result.state,
      summary: resolvePromotionSummary(result.state),
      readiness: resolvePromotionReadiness(result.state),
    });
  } catch (error) {
    const message = safeErrorMessage(error, "Failed to promote workflow environment");
    const status =
      message.includes("not found") || message.includes("Not found") ? 404 : 409;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}
