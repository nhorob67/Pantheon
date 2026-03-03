import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  getTenantRuntimeRunById,
  patchTenantRuntimeRunMetadata,
} from "@/lib/runtime/tenant-runtime-queue";

const deadLetterDismissRouteParamsSchema = z.object({
  runId: z.uuid(),
});

async function isAuthorized(request: Request): Promise<boolean> {
  const expectedTokens = [
    process.env.TENANT_RUNTIME_PROCESSOR_TOKEN,
    process.env.WORKFLOW_RUN_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-tenant-runtime-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!(user && isAdmin(user.email));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedParams = deadLetterDismissRouteParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid dead-letter run ID" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const run = await getTenantRuntimeRunById(admin, parsedParams.data.runId);
    if (!run) {
      return NextResponse.json({ error: "Tenant runtime run not found" }, { status: 404 });
    }

    const dismissed = await patchTenantRuntimeRunMetadata(admin, run, {
      dead_lettered: true,
      dead_letter_dismissed: true,
      dead_letter_dismissed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      run: dismissed,
      action: "dismissed",
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to dismiss dead-letter runtime run") },
      { status: 500 }
    );
  }
}
