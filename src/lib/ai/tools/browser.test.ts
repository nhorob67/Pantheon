import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Test the Zod input schemas used by browser tools (validate without Playwright)

describe("browser tool input schemas", () => {
  const navigateSchema = z.object({
    url: z.string().max(2048),
  });

  const extractSchema = z.object({
    instruction: z.string().max(500),
    format: z.enum(["json", "text", "table"]).default("json"),
  });

  const clickSchema = z.object({
    element_description: z.string().max(300),
  });

  const fillSchema = z.object({
    field_description: z.string().max(300),
    value: z.string().max(1000),
  });

  const screenshotSchema = z.object({
    full_page: z.boolean().default(false),
  });

  it("validates browser_navigate input", () => {
    const result = navigateSchema.safeParse({ url: "https://example.com" });
    assert.ok(result.success);
    assert.equal(result.data!.url, "https://example.com");
  });

  it("rejects oversized URLs", () => {
    const result = navigateSchema.safeParse({ url: "https://" + "a".repeat(2050) });
    assert.ok(!result.success);
  });

  it("validates browser_extract input", () => {
    const result = extractSchema.safeParse({ instruction: "extract the price" });
    assert.ok(result.success);
    assert.equal(result.data!.format, "json");
  });

  it("validates browser_extract with explicit format", () => {
    const result = extractSchema.safeParse({ instruction: "get data", format: "table" });
    assert.ok(result.success);
    assert.equal(result.data!.format, "table");
  });

  it("rejects invalid extract format", () => {
    const result = extractSchema.safeParse({ instruction: "get data", format: "invalid" });
    assert.ok(!result.success);
  });

  it("validates browser_click input", () => {
    const result = clickSchema.safeParse({ element_description: "Submit button" });
    assert.ok(result.success);
  });

  it("validates browser_fill input", () => {
    const result = fillSchema.safeParse({ field_description: "Email", value: "test@example.com" });
    assert.ok(result.success);
  });

  it("rejects oversized fill values", () => {
    const result = fillSchema.safeParse({ field_description: "Name", value: "x".repeat(1001) });
    assert.ok(!result.success);
  });

  it("validates browser_screenshot with defaults", () => {
    const result = screenshotSchema.safeParse({});
    assert.ok(result.success);
    assert.equal(result.data!.full_page, false);
  });

  it("validates browser_screenshot with full_page", () => {
    const result = screenshotSchema.safeParse({ full_page: true });
    assert.ok(result.success);
    assert.equal(result.data!.full_page, true);
  });
});
