import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { listWorkflowRunsPage } from "@/lib/queries/workflow-runs";
import { listWorkflowRunsQuerySchema } from "@/lib/validators/workflow";
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

export async function GET(
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

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const searchParams = new URL(request.url).searchParams;
  const parsedQuery = listWorkflowRunsQuerySchema.safeParse({
    workflow_id: searchParams.get("workflow_id") || undefined,
    status: searchParams.get("status") || undefined,
    limit: searchParams.get("limit") || undefined,
    offset: searchParams.get("offset") || undefined,
    cursor: searchParams.get("cursor") || undefined,
    started_from: searchParams.get("started_from") || undefined,
    started_to: searchParams.get("started_to") || undefined,
    min_duration_seconds: searchParams.get("min_duration_seconds") || undefined,
    max_duration_seconds: searchParams.get("max_duration_seconds") || undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsedQuery.error.flatten() },
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
    const page = await listWorkflowRunsPage(admin, {
      instanceId: id,
      customerId: instance.customer_id,
      workflowId: parsedQuery.data.workflow_id,
      status: parsedQuery.data.status,
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset,
      cursor: parsedQuery.data.cursor,
      startedFrom: parsedQuery.data.started_from,
      startedTo: parsedQuery.data.started_to,
      minDurationSeconds: parsedQuery.data.min_duration_seconds,
      maxDurationSeconds: parsedQuery.data.max_duration_seconds,
    });

    return NextResponse.json({
      runs: page.runs,
      filters: {
        workflow_id: parsedQuery.data.workflow_id || null,
        status: parsedQuery.data.status || null,
        started_from: parsedQuery.data.started_from || null,
        started_to: parsedQuery.data.started_to || null,
        min_duration_seconds: parsedQuery.data.min_duration_seconds ?? null,
        max_duration_seconds: parsedQuery.data.max_duration_seconds ?? null,
      },
      pagination: {
        limit: parsedQuery.data.limit,
        offset: parsedQuery.data.offset,
        cursor: parsedQuery.data.cursor || null,
        next_cursor: page.nextCursor,
        returned: page.runs.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load workflow runs") },
      { status: 500 }
    );
  }
}
