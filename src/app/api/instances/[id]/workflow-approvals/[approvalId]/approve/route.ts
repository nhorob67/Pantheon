import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { workflowApprovalActionRequestSchema } from "@/lib/validators/workflow";
import {
  applyWorkflowApprovalDecision,
  WorkflowApprovalDecisionError,
} from "@/lib/workflows/approval-decisions";
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
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  const { id, approvalId } = await params;
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

  let body: unknown = {};
  try {
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      body = JSON.parse(rawBody);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedRequest = workflowApprovalActionRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsedRequest.error.flatten() },
      { status: 400 }
    );
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

  try {
    const result = await applyWorkflowApprovalDecision({
      admin,
      instanceId: id,
      customerId: instance.customer_id,
      approvalId,
      actorUserId: user.id,
      decision: "approved",
      comment: parsedRequest.data.comment,
    });

    auditLog({
      action: "workflow.approval.approved",
      actor: user.email || user.id,
      resource_type: "workflow_approval",
      resource_id: result.approval.id,
      details: {
        customer_id: instance.customer_id,
        instance_id: id,
        workflow_id: result.workflowId,
        run_id: result.runId,
        node_id: result.approval.node_id,
        comment: result.approval.decision_comment,
        run_status: result.runStatus,
        gate: result.gate,
      },
    });

    return NextResponse.json({
      approval: result.approval,
      run: {
        id: result.runId,
        status: result.runStatus,
      },
      gate: result.gate,
    });
  } catch (error) {
    if (error instanceof WorkflowApprovalDecisionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to approve workflow approval") },
      { status: 500 }
    );
  }
}
