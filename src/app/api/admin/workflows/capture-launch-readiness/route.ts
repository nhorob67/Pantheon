import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { workflowLaunchReadinessCaptureRequestSchema } from "@/lib/validators/workflow";
import {
  persistWorkflowLaunchReadinessSnapshot,
  type WorkflowLaunchReadinessCaptureSource,
} from "@/lib/workflows/launch-readiness";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";

export const runtime = "nodejs";

interface CaptureBody {
  days?: unknown;
  min_samples?: unknown;
  instance_limit?: unknown;
}

interface AuthorizationOptions {
  allowSessionAuth: boolean;
}

interface InstanceRow {
  id: string;
  customer_id: string;
}

async function parseBody(request: Request): Promise<CaptureBody> {
  try {
    const body = (await request.json()) as CaptureBody;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function parseQueryParams(request: Request): CaptureBody {
  try {
    const query = new URL(request.url).searchParams;
    return {
      days: query.get("days") || undefined,
      min_samples: query.get("min_samples") || undefined,
      instance_limit: query.get("instance_limit") || undefined,
    };
  } catch {
    return {};
  }
}

async function isAuthorized(
  request: Request,
  options: AuthorizationOptions
): Promise<boolean> {
  const expectedTokens = [
    process.env.WORKFLOW_LAUNCH_READINESS_CAPTURE_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get(
    "x-workflow-launch-readiness-capture-token"
  );
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  if (!options.allowSessionAuth) {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return !!(user && isAdmin(user.email));
}

async function processCaptureRequest(
  request: Request,
  options: { body: CaptureBody; allowSessionAuth: boolean }
) {
  const authorized = await isAuthorized(request, {
    allowSessionAuth: options.allowSessionAuth,
  });
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedInput = workflowLaunchReadinessCaptureRequestSchema.safeParse({
    days: options.body.days,
    min_samples: options.body.min_samples,
    instance_limit: options.body.instance_limit,
  });

  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsedInput.error.flatten() },
      { status: 400 }
    );
  }

  const captureSource: WorkflowLaunchReadinessCaptureSource = options.allowSessionAuth
    ? "api"
    : "scheduled";

  const admin = createAdminClient();
  const { data: instancesData, error: instancesError } = await admin
    .from("instances")
    .select("id, customer_id")
    .order("created_at", { ascending: false })
    .limit(parsedInput.data.instance_limit);

  if (instancesError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          instancesError,
          "Failed to load instances for launch-readiness capture"
        ),
      },
      { status: 500 }
    );
  }

  const instances = (instancesData || []) as InstanceRow[];
  if (instances.length === 0) {
    return NextResponse.json({
      scanned_instances: 0,
      captured: 0,
      skipped_builder_disabled: 0,
      failed: 0,
      errors: [],
      generated_at: new Date().toISOString(),
    });
  }

  let captured = 0;
  let skippedBuilderDisabled = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const instance of instances) {
    const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
      admin,
      instance.customer_id
    );

    if (!workflowBuilderEnabled) {
      skippedBuilderDisabled += 1;
      continue;
    }

    try {
      await persistWorkflowLaunchReadinessSnapshot(admin, {
        customerId: instance.customer_id,
        instanceId: instance.id,
        timeframeDays: parsedInput.data.days,
        minSamplesPerMetric: parsedInput.data.min_samples,
        captureSource,
      });
      captured += 1;
    } catch (error) {
      failed += 1;
      errors.push(
        `${instance.id}: ${safeErrorMessage(
          error,
          "Launch-readiness capture failed"
        )}`
      );
    }
  }

  auditLog({
    action: "workflow.launch_readiness.capture",
    actor: options.allowSessionAuth ? "workflow-admin" : "workflow-launch-readiness-cron",
    resource_type: "workflow_launch_readiness",
    resource_id: "batch",
    details: {
      scanned_instances: instances.length,
      captured,
      skipped_builder_disabled: skippedBuilderDisabled,
      failed,
      days: parsedInput.data.days,
      min_samples: parsedInput.data.min_samples,
      capture_source: captureSource,
    },
  });

  return NextResponse.json({
    scanned_instances: instances.length,
    captured,
    skipped_builder_disabled: skippedBuilderDisabled,
    failed,
    errors: errors.slice(0, 25),
    generated_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  return processCaptureRequest(request, {
    body,
    allowSessionAuth: true,
  });
}

export async function GET(request: Request) {
  const body = parseQueryParams(request);
  return processCaptureRequest(request, {
    body,
    allowSessionAuth: false,
  });
}
