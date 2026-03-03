import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  getTenantExport,
  listTenantExportFiles,
  listTenantExportJobs,
} from "@/lib/runtime/tenant-exports";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { auditLog } from "@/lib/security/audit";

const tenantExportByIdRouteParamsSchema = z.object({
  tenantId: z.uuid(),
  exportId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; exportId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantExportByIdRouteParamsSchema,
    errorMessage: "Invalid tenant export path",
  });
  if (parsedParams instanceof Response) {
    return parsedParams;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to resolve tenant export",
    },
    async (state) => {
      const exportRecord = await getTenantExport(
        state.admin,
        state.tenantContext.tenantId,
        parsedParams.data.exportId
      );

      if (!exportRecord) {
        auditLog({
          action: "tenant.export.view_missing",
          actor: state.user.id,
          resource_type: "tenant_export",
          resource_id: parsedParams.data.exportId,
          details: {
            tenant_id: state.tenantContext.tenantId,
          },
        });
        return NextResponse.json({ error: "Tenant export not found" }, { status: 404 });
      }

      const [files, jobs] = await Promise.all([
        listTenantExportFiles(state.admin, state.tenantContext.tenantId, exportRecord.id),
        listTenantExportJobs(state.admin, state.tenantContext.tenantId, exportRecord.id),
      ]);

      const signedUrls: Record<string, string> = {};
      await Promise.all(
        files.map(async (file) => {
          const bucket =
            typeof file.storage_bucket === "string" ? file.storage_bucket : null;
          const path = typeof file.storage_path === "string" ? file.storage_path : null;
          const fileName = typeof file.file_name === "string" ? file.file_name : null;

          if (!bucket || !path || !fileName) {
            return;
          }

          const { data } = await state.admin.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) {
            signedUrls[fileName] = data.signedUrl;
          }
        })
      );
      auditLog({
        action: "tenant.export.view",
        actor: state.user.id,
        resource_type: "tenant_export",
        resource_id: exportRecord.id,
        details: {
          tenant_id: state.tenantContext.tenantId,
          file_count: files.length,
          job_count: jobs.length,
        },
      });

      return NextResponse.json({
        export: exportRecord,
        files,
        jobs,
        signed_urls: signedUrls,
      });
    }
  );
}
