import assert from "node:assert/strict";
import test from "node:test";
import {
  INSTANCE_BRIDGE_DEPRECATION_HEADER,
  INSTANCE_BRIDGE_DEPRECATION_VALUE,
  INSTANCE_BRIDGE_ROUTE_MODE_HEADER,
  INSTANCE_BRIDGE_ROUTE_MODE_VALUE,
  INSTANCE_BRIDGE_SUNSET_HEADER,
  INSTANCE_BRIDGE_SUNSET_VALUE,
  INSTANCE_BRIDGE_TENANT_ID_HEADER,
  shouldBridgeInstanceRead,
  shouldBridgeInstanceWrite,
  withInstanceBridgeHeaders,
} from "./instance-bridge.ts";
import { REQUEST_ID_HEADER } from "./request-trace.ts";

test("shouldBridgeInstanceRead only enables bridge when read gate and tenant id are present", () => {
  assert.equal(
    shouldBridgeInstanceRead({ reads_enabled: true }, "tenant-123"),
    true
  );
  assert.equal(
    shouldBridgeInstanceRead({ reads_enabled: false }, "tenant-123"),
    false
  );
  assert.equal(
    shouldBridgeInstanceRead({ reads_enabled: true }, "   "),
    false
  );
  assert.equal(shouldBridgeInstanceRead({ reads_enabled: true }, null), false);
});

test("shouldBridgeInstanceWrite only enables bridge when write gate and tenant id are present", () => {
  assert.equal(
    shouldBridgeInstanceWrite({ writes_enabled: true }, "tenant-123"),
    true
  );
  assert.equal(
    shouldBridgeInstanceWrite({ writes_enabled: false }, "tenant-123"),
    false
  );
  assert.equal(
    shouldBridgeInstanceWrite({ writes_enabled: true }, ""),
    false
  );
  assert.equal(shouldBridgeInstanceWrite({ writes_enabled: true }, null), false);
});

test("withInstanceBridgeHeaders sets bridge and request trace headers", () => {
  const response = { headers: new Headers() } as unknown as Parameters<
    typeof withInstanceBridgeHeaders
  >[0];

  withInstanceBridgeHeaders(response, "tenant-123", "trace-123");

  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_ROUTE_MODE_HEADER),
    INSTANCE_BRIDGE_ROUTE_MODE_VALUE
  );
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_TENANT_ID_HEADER),
    "tenant-123"
  );
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_DEPRECATION_HEADER),
    INSTANCE_BRIDGE_DEPRECATION_VALUE
  );
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_SUNSET_HEADER),
    INSTANCE_BRIDGE_SUNSET_VALUE
  );
  assert.equal(response.headers.get(REQUEST_ID_HEADER), "trace-123");
});

test("withInstanceBridgeHeaders omits trace header when not provided", () => {
  const response = { headers: new Headers() } as unknown as Parameters<
    typeof withInstanceBridgeHeaders
  >[0];

  withInstanceBridgeHeaders(response, "tenant-456");

  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_ROUTE_MODE_HEADER),
    INSTANCE_BRIDGE_ROUTE_MODE_VALUE
  );
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_TENANT_ID_HEADER),
    "tenant-456"
  );
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_DEPRECATION_HEADER),
    INSTANCE_BRIDGE_DEPRECATION_VALUE
  );
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_SUNSET_HEADER),
    INSTANCE_BRIDGE_SUNSET_VALUE
  );
  assert.equal(response.headers.has(REQUEST_ID_HEADER), false);
});

test("withInstanceBridgeHeaders preserves existing headers while asserting bridge mode", () => {
  const response = { headers: new Headers({ "content-type": "application/json" }) } as unknown as Parameters<
    typeof withInstanceBridgeHeaders
  >[0];

  withInstanceBridgeHeaders(response, "tenant-789", "trace-789");

  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_ROUTE_MODE_HEADER),
    INSTANCE_BRIDGE_ROUTE_MODE_VALUE
  );
  assert.equal(response.headers.get(INSTANCE_BRIDGE_TENANT_ID_HEADER), "tenant-789");
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_DEPRECATION_HEADER),
    INSTANCE_BRIDGE_DEPRECATION_VALUE
  );
  assert.equal(
    response.headers.get(INSTANCE_BRIDGE_SUNSET_HEADER),
    INSTANCE_BRIDGE_SUNSET_VALUE
  );
  assert.equal(response.headers.get(REQUEST_ID_HEADER), "trace-789");
});
