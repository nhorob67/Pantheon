import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { listTenantRuntimeDeadLetterRuns } from "@/lib/runtime/tenant-runtime-queue";
import type { TenantRuntimeRunKind } from "@/types/tenant-runtime";

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

function parseLimit(value: string | null): number {
  if (!value) {
    return 50;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.max(1, Math.min(200, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const runKindParam = url.searchParams.get("run_kind");
    const runKind: TenantRuntimeRunKind | undefined =
      runKindParam === "discord_canary" || runKindParam === "discord_runtime"
        ? runKindParam
        : undefined;
    const admin = createAdminClient();
    const runs = await listTenantRuntimeDeadLetterRuns(admin, {
      limit: parseLimit(url.searchParams.get("limit")),
      tenantId: url.searchParams.get("tenant_id"),
      runKind,
    });

    return NextResponse.json({
      runs,
      count: runs.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to list tenant runtime dead-letter runs") },
      { status: 500 }
    );
  }
}
