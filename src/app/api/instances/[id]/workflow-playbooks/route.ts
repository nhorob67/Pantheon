import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  createWorkflowPlaybookRequestSchema,
  listWorkflowPlaybooksQuerySchema,
} from "@/lib/validators/workflow";
import {
  listWorkflowPlaybookCatalog,
  publishWorkflowAsPlaybook,
} from "@/lib/workflows/playbooks";
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

async function getAuthorizedInstance(instanceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", instanceId)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return { error: "Not found", status: 404 } as const;
  }

  return { user, instance } as const;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthorizedInstance(id);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const query = new URL(request.url).searchParams;
  const parsedQuery = listWorkflowPlaybooksQuerySchema.safeParse({
    q: query.get("q") || undefined,
    category: query.get("category") || undefined,
    status: query.get("status") || undefined,
    visibility: query.get("visibility") || undefined,
    include_owned: query.get("include_owned") || undefined,
    limit: query.get("limit") || undefined,
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
    authResult.instance.customer_id
  );

  if (!workflowBuilderEnabled) {
    return NextResponse.json(
      { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  try {
    const playbooks = await listWorkflowPlaybookCatalog(admin, {
      customerId: authResult.instance.customer_id,
      includeOwned: parsedQuery.data.include_owned,
      search: parsedQuery.data.q,
      category: parsedQuery.data.category,
      status: parsedQuery.data.status,
      visibility: parsedQuery.data.visibility,
      limit: parsedQuery.data.limit,
    });

    return NextResponse.json({ playbooks });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load workflow playbooks") },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedRequest = createWorkflowPlaybookRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsedRequest.error.flatten() },
      { status: 400 }
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

  try {
    const result = await publishWorkflowAsPlaybook(admin, {
      instanceId: id,
      customerId: authResult.instance.customer_id,
      workflowId: parsedRequest.data.workflow_id,
      slug: parsedRequest.data.slug,
      name: parsedRequest.data.name,
      description: parsedRequest.data.description,
      summary: parsedRequest.data.summary,
      category: parsedRequest.data.category,
      tags: parsedRequest.data.tags,
      visibility: parsedRequest.data.visibility,
      status: parsedRequest.data.status,
      metadata: parsedRequest.data.metadata,
      actorId: authResult.user.id,
    });

    auditLog({
      action: "workflow.playbook.publish",
      actor: authResult.user.email || authResult.user.id,
      resource_type: "workflow_playbook",
      resource_id: result.playbook.id,
      details: {
        customer_id: authResult.instance.customer_id,
        instance_id: id,
        workflow_id: parsedRequest.data.workflow_id,
        slug: result.playbook.slug,
        version: result.version.version,
        created: result.created,
        status: result.playbook.status,
        visibility: result.playbook.visibility,
      },
    });

    return NextResponse.json(
      {
        playbook: result.playbook,
        version: result.version,
        created: result.created,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    const message = safeErrorMessage(error, "Failed to publish workflow playbook");

    if (message.includes("not found") || message.includes("already in use")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
