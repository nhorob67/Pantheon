import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import {
  fetchHeartbeatAuditReport,
  fetchHeartbeatOverview,
  fetchHeartbeatRunsReport,
  fetchHeartbeatTrendsReport,
} from "@/lib/queries/heartbeat-reporting";
import {
  heartbeatAuditReportQuerySchema,
  heartbeatReportModeSchema,
  heartbeatRunsReportQuerySchema,
  heartbeatTrendsReportQuerySchema,
} from "@/lib/validators/heartbeat";

const paramsSchema = z.object({ tenantId: z.uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to fetch heartbeat activity",
    },
    async ({ admin, tenantContext }) => {
      const url = new URL(request.url);
      const modeParsed = heartbeatReportModeSchema.safeParse(
        url.searchParams.get("mode") || "overview"
      );

      if (!modeParsed.success) {
        return NextResponse.json({ error: "Invalid heartbeat report mode" }, { status: 400 });
      }

      if (modeParsed.data === "runs") {
        const parsed = heartbeatRunsReportQuerySchema.safeParse({
          config_id: url.searchParams.get("config_id") || undefined,
          delivery_status: url.searchParams.get("delivery_status") || undefined,
          trigger_mode: url.searchParams.get("trigger_mode") || undefined,
          signal_type: url.searchParams.get("signal_type") || undefined,
          date_from: url.searchParams.get("date_from") || undefined,
          date_to: url.searchParams.get("date_to") || undefined,
          query: url.searchParams.get("query") || undefined,
          page: url.searchParams.get("page") || undefined,
          page_size: url.searchParams.get("page_size") || undefined,
        });

        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid heartbeat runs filters", details: parsed.error.flatten() },
            { status: 400 }
          );
        }

        const report = await fetchHeartbeatRunsReport(admin, tenantContext.tenantId, parsed.data);
        return NextResponse.json(report);
      }

      if (modeParsed.data === "trends") {
        const parsed = heartbeatTrendsReportQuerySchema.safeParse({
          config_id: url.searchParams.get("config_id") || undefined,
          date_from: url.searchParams.get("date_from") || undefined,
          date_to: url.searchParams.get("date_to") || undefined,
        });

        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid heartbeat trends filters", details: parsed.error.flatten() },
            { status: 400 }
          );
        }

        const report = await fetchHeartbeatTrendsReport(admin, tenantContext.tenantId, parsed.data);
        return NextResponse.json(report);
      }

      if (modeParsed.data === "audit") {
        const parsed = heartbeatAuditReportQuerySchema.safeParse({
          config_id: url.searchParams.get("config_id") || undefined,
          kind: url.searchParams.get("kind") || undefined,
          date_from: url.searchParams.get("date_from") || undefined,
          date_to: url.searchParams.get("date_to") || undefined,
          query: url.searchParams.get("query") || undefined,
          page: url.searchParams.get("page") || undefined,
          page_size: url.searchParams.get("page_size") || undefined,
        });

        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid heartbeat audit filters", details: parsed.error.flatten() },
            { status: 400 }
          );
        }

        const report = await fetchHeartbeatAuditReport(admin, tenantContext.tenantId, parsed.data);
        return NextResponse.json(report);
      }

      const activity = await fetchHeartbeatOverview(admin, tenantContext.tenantId);
      return NextResponse.json(activity);
    }
  );
}
