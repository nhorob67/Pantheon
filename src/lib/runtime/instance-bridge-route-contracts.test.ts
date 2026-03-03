import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const BRIDGE_ROUTE_FILES = [
  "src/app/api/instances/[id]/agents/route.ts",
  "src/app/api/instances/[id]/agents/[agentId]/route.ts",
  "src/app/api/instances/[id]/knowledge/route.ts",
  "src/app/api/instances/[id]/knowledge/[fileId]/route.ts",
  "src/app/api/instances/[id]/memory/settings/route.ts",
  "src/app/api/instances/[id]/memory/checkpoint/route.ts",
  "src/app/api/instances/[id]/memory/compress/route.ts",
];

test("launch-critical instance bridge routes keep shared bridge header and gate helpers", () => {
  for (const file of BRIDGE_ROUTE_FILES) {
    const source = readFileSync(file, "utf8");

    assert.match(
      source,
      /withInstanceBridgeHeaders/,
      `${file} must set shared bridge headers`
    );

    assert.match(
      source,
      /resolveRequestTraceIdFromHeaders/,
      `${file} must propagate request trace headers`
    );

    assert.match(
      source,
      /shouldBridgeInstance(Read|Write)/,
      `${file} must rely on shared bridge gate decision`
    );
  }
});
