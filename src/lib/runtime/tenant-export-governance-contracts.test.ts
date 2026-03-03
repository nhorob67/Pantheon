import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("tenant export routes enforce role checks and emit audit events", () => {
  const createRoute = readFileSync("src/app/api/tenants/[tenantId]/export/route.ts", "utf8");
  const retryRoute = readFileSync(
    "src/app/api/tenants/[tenantId]/export/[exportId]/retry/route.ts",
    "utf8"
  );
  const detailRoute = readFileSync(
    "src/app/api/tenants/[tenantId]/export/[exportId]/route.ts",
    "utf8"
  );

  assert.match(createRoute, /canExportTenantData/);
  assert.match(retryRoute, /canExportTenantData/);

  assert.match(createRoute, /auditLog\s*\(/);
  assert.match(retryRoute, /auditLog\s*\(/);
  assert.match(detailRoute, /auditLog\s*\(/);
});

test("admin export processor keeps auth gate and audit emission", () => {
  const processorRoute = readFileSync(
    "src/app/api/admin/tenants/exports/process/route.ts",
    "utf8"
  );

  assert.match(processorRoute, /isAuthorized\s*\(/);
  assert.match(processorRoute, /auditLog\s*\(/);
  assert.match(processorRoute, /x-tenant-export-processor-token/);
});
