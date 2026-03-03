import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { buildPhase3ReleaseGateReport } from "@/lib/runtime/tenant-runtime-release-gates";
import { getSupabaseServiceRoleEnvIssues } from "@/lib/runtime/supabase-env";

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

function parseNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export async function GET(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const envIssues = getSupabaseServiceRoleEnvIssues();
  if (envIssues.length > 0) {
    return NextResponse.json(
      {
        error: "Runtime release-gates evaluation is unavailable until Supabase environment variables are configured",
        details: envIssues,
      },
      { status: 503 }
    );
  }

  try {
    const url = new URL(request.url);
    const windowMinutes = Math.max(5, Math.min(24 * 60, parseNumber(url.searchParams.get("window_minutes")) || 60));
    const report = await buildPhase3ReleaseGateReport(createAdminClient(), {
      windowMinutes,
      thresholds: {
        minSamples: parseNumber(url.searchParams.get("min_samples")) || undefined,
        minSuccessRate: parseNumber(url.searchParams.get("min_success_rate")) || undefined,
        maxP95QueueToTerminalMs:
          parseNumber(url.searchParams.get("max_p95_queue_to_terminal_ms")) || undefined,
        maxP95QueueToStartMs:
          parseNumber(url.searchParams.get("max_p95_queue_to_start_ms")) || undefined,
        maxDeadLetterOpen:
          parseNumber(url.searchParams.get("max_dead_letter_open")) || undefined,
      },
    });

    return NextResponse.json(
      {
        phase: "phase_3_release_gates",
        report,
      },
      { status: report.passed ? 200 : 409 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to evaluate Phase 3 release gates") },
      { status: 500 }
    );
  }
}
