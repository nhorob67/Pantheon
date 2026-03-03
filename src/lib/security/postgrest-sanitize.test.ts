import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeLikePattern,
  sanitizeOrFilterValue,
  sanitizeSearchForOr,
} from "./postgrest-sanitize.ts";

describe("sanitizeLikePattern", () => {
  it("escapes percent", () => {
    assert.equal(sanitizeLikePattern("100%"), "100\\%");
  });

  it("escapes underscore", () => {
    assert.equal(sanitizeLikePattern("field_name"), "field\\_name");
  });

  it("escapes mixed input", () => {
    assert.equal(sanitizeLikePattern("%_combo_%"), "\\%\\_combo\\_\\%");
  });

  it("passes through normal text", () => {
    assert.equal(sanitizeLikePattern("corn"), "corn");
  });

  it("handles empty string", () => {
    assert.equal(sanitizeLikePattern(""), "");
  });
});

describe("sanitizeOrFilterValue", () => {
  it("escapes percent", () => {
    assert.equal(sanitizeOrFilterValue("100%"), "100\\%");
  });

  it("escapes underscore", () => {
    assert.equal(sanitizeOrFilterValue("a_b"), "a\\_b");
  });

  it("escapes comma", () => {
    assert.equal(sanitizeOrFilterValue("a,b"), "a\\,b");
  });

  it("escapes all together", () => {
    assert.equal(sanitizeOrFilterValue("%_,mix"), "\\%\\_\\,mix");
  });

  it("passes through normal text", () => {
    assert.equal(sanitizeOrFilterValue("soybeans"), "soybeans");
  });
});

describe("sanitizeSearchForOr", () => {
  it("trims and escapes", () => {
    assert.equal(sanitizeSearchForOr("  hello%  "), "hello\\%");
  });

  it("returns empty for blank input", () => {
    assert.equal(sanitizeSearchForOr("   "), "");
  });

  it("returns empty for empty string", () => {
    assert.equal(sanitizeSearchForOr(""), "");
  });

  it("escapes commas", () => {
    assert.equal(sanitizeSearchForOr("a,b"), "a\\,b");
  });
});
