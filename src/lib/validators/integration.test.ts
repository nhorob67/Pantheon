import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  integrationStoreCredentialSchema,
  integrationRegisterSchema,
  integrationApiCallSchema,
  integrationListSchema,
  integrationUpdateSchema,
} from "./integration.ts";

describe("integration validators", () => {
  describe("integrationStoreCredentialSchema", () => {
    it("accepts valid input", () => {
      const result = integrationStoreCredentialSchema.safeParse({
        service_slug: "discourse",
        api_key: "abc123xyz",
        auth_method: "api_key",
      });
      assert.ok(result.success);
      assert.equal(result.data.service_slug, "discourse");
    });

    it("defaults auth_method to api_key", () => {
      const result = integrationStoreCredentialSchema.safeParse({
        service_slug: "github",
        api_key: "ghp_xxxx",
      });
      assert.ok(result.success);
      assert.equal(result.data.auth_method, "api_key");
    });

    it("rejects invalid slug format", () => {
      const result = integrationStoreCredentialSchema.safeParse({
        service_slug: "INVALID SLUG",
        api_key: "abc123",
      });
      assert.ok(!result.success);
    });

    it("rejects empty api_key", () => {
      const result = integrationStoreCredentialSchema.safeParse({
        service_slug: "discourse",
        api_key: "",
      });
      assert.ok(!result.success);
    });

    it("accepts optional auth_header", () => {
      const result = integrationStoreCredentialSchema.safeParse({
        service_slug: "discourse",
        api_key: "abc123",
        auth_method: "header",
        auth_header: "X-Custom-Token",
      });
      assert.ok(result.success);
      assert.equal(result.data.auth_header, "X-Custom-Token");
    });
  });

  describe("integrationRegisterSchema", () => {
    it("accepts valid input with all fields", () => {
      const result = integrationRegisterSchema.safeParse({
        slug: "discourse",
        display_name: "Community Forum",
        service_type: "discourse",
        base_url: "https://forum.example.com",
        auth_method: "api_key",
        api_docs_url: "https://docs.discourse.org/api",
        discovered_endpoints: [
          { method: "GET", path: "/site.json", description: "Site info" },
        ],
        capabilities_summary: "User management, topics, posts",
      });
      assert.ok(result.success);
      assert.equal(result.data.slug, "discourse");
    });

    it("accepts minimal input", () => {
      const result = integrationRegisterSchema.safeParse({
        slug: "test-api",
        display_name: "Test API",
        service_type: "generic-rest",
      });
      assert.ok(result.success);
    });

    it("rejects discovered_endpoints exceeding max", () => {
      const endpoints = Array.from({ length: 101 }, (_, i) => ({
        method: "GET",
        path: `/endpoint-${i}`,
        description: `Endpoint ${i}`,
      }));
      const result = integrationRegisterSchema.safeParse({
        slug: "test",
        display_name: "Test",
        service_type: "test",
        discovered_endpoints: endpoints,
      });
      assert.ok(!result.success);
    });
  });

  describe("integrationApiCallSchema", () => {
    it("accepts valid GET request", () => {
      const result = integrationApiCallSchema.safeParse({
        integration_slug: "discourse",
        method: "GET",
        path: "/site.json",
      });
      assert.ok(result.success);
    });

    it("rejects path not starting with /", () => {
      const result = integrationApiCallSchema.safeParse({
        integration_slug: "discourse",
        path: "site.json",
      });
      assert.ok(!result.success);
    });

    it("accepts POST with body", () => {
      const result = integrationApiCallSchema.safeParse({
        integration_slug: "discourse",
        method: "POST",
        path: "/posts.json",
        body: '{"raw":"Hello world"}',
      });
      assert.ok(result.success);
    });
  });

  describe("integrationListSchema", () => {
    it("accepts empty object", () => {
      const result = integrationListSchema.safeParse({});
      assert.ok(result.success);
    });

    it("accepts valid status filter", () => {
      const result = integrationListSchema.safeParse({ status: "active" });
      assert.ok(result.success);
    });

    it("rejects invalid status", () => {
      const result = integrationListSchema.safeParse({ status: "unknown" });
      assert.ok(!result.success);
    });
  });

  describe("integrationUpdateSchema", () => {
    it("accepts partial update", () => {
      const result = integrationUpdateSchema.safeParse({
        status: "inactive",
      });
      assert.ok(result.success);
    });

    it("accepts display_name update", () => {
      const result = integrationUpdateSchema.safeParse({
        display_name: "New Name",
      });
      assert.ok(result.success);
    });
  });
});
