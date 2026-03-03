import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "./escape-html.ts";

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    assert.equal(escapeHtml("a&b"), "a&amp;b");
  });

  it("escapes angle brackets", () => {
    assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  });

  it("escapes double quotes", () => {
    assert.equal(escapeHtml('a"b'), "a&quot;b");
  });

  it("escapes single quotes", () => {
    assert.equal(escapeHtml("a'b"), "a&#39;b");
  });

  it("escapes all special characters together", () => {
    assert.equal(
      escapeHtml(`<img src="x" onerror='alert(1)'>&`),
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;"
    );
  });

  it("returns empty string for empty input", () => {
    assert.equal(escapeHtml(""), "");
  });

  it("passes through safe text unchanged", () => {
    assert.equal(escapeHtml("Hello world 123"), "Hello world 123");
  });
});
