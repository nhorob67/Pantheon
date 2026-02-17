import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { installWorkflowPlaybookRequestSchema } from "@/lib/validators/workflow";
import { installWorkflowPlaybook } from "@/lib/workflows/playbooks";
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
  { params }: { params: Promise<{ id: string; playbookId: string }> }
) {
  const { id, playbookId } = await params;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedRequest = installWorkflowPlaybookRequestSchema.safeParse(body);
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
    const result = await installWorkflowPlaybook(admin, {
      instanceId: id,
      customerId: instance.customer_id,
      playbookId,
      actorId: user.id,
      name: parsedRequest.data.name,
      description: parsedRequest.data.description,
      tags: parsedRequest.data.tags,
      ownerId: parsedRequest.data.owner_id,
    });

    auditLog({
      action: "workflow.playbook.install",
      actor: user.email || user.id,
      resource_type: "workflow",
      resource_id: result.workflow.id,
      details: {
        customer_id: instance.customer_id,
        instance_id: id,
        playbook_id: result.playbook.id,
        playbook_slug: result.playbook.slug,
        playbook_version: result.playbook.latest_version,
      },
    });

    return NextResponse.json(
      {
        workflow: result.workflow,
        playbook: {
          id: result.playbook.id,
          slug: result.playbook.slug,
          name: result.playbook.name,
          latest_version: result.playbook.latest_version,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = safeErrorMessage(error, "Failed to install workflow playbook");

    if (message.includes("not found") || message.includes("access")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("already exists")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
