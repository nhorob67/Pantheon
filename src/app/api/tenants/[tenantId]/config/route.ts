import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { teamProfileSchema } from "@/lib/validators/team-profile";

import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const tenantConfigRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantConfigRouteParamsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) {
    return parsedParams;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for team profile management",
      fallbackErrorMessage: "Failed to update team profile",
    },
    async (state) => {
      const rateLimit = await consumeConfigUpdateRateLimit(state.user.id);
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

      const parsedBody = teamProfileSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const { data: updatedProfile, error: updateError } = await state.admin
        .from("team_profiles")
        .update({
          team_name: parsedBody.data.team_name,
          timezone: parsedBody.data.timezone,
        })
        .eq("customer_id", state.tenantContext.customerId)
        .select("id")
        .maybeSingle();

      if (updateError) {
        return NextResponse.json(
          { error: safeErrorMessage(updateError, "Failed to update team profile") },
          { status: 500 }
        );
      }

      if (!updatedProfile) {
        return NextResponse.json({ error: "Team profile not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }
  );
}
