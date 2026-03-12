import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseExpansionResponse,
  flattenExpansion,
  type ExpandedQuery,
} from "./query-expander.ts";

describe("parseExpansionResponse", () => {
  it("parses valid JSON response", () => {
    const json = JSON.stringify({
      lex: ["project update", "status report"],
      vec: ["What was the latest project update?"],
      hyde: "Sent a project status report to the client on Oct 15 covering Q3 milestones.",
    });
    const result = parseExpansionResponse("project update", json);
    assert.equal(result.source, "llm");
    assert.equal(result.original, "project update");
    assert.deepEqual(result.lex, ["project update", "status report"]);
    assert.deepEqual(result.vec, ["What was the latest project update?"]);
    assert.ok(result.hyde !== null);
  });

  it("falls back on malformed JSON", () => {
    const result = parseExpansionResponse("test query", "not json at all");
    assert.equal(result.source, "heuristic");
    assert.equal(result.original, "test query");
  });

  it("strips markdown fences", () => {
    const json = '```json\n{"lex":["quarterly report"],"vec":["What is the quarterly report?"],"hyde":null}\n```';
    const result = parseExpansionResponse("quarterly report", json);
    assert.equal(result.source, "llm");
    assert.deepEqual(result.lex, ["quarterly report"]);
  });

  it("falls back when all fields are empty", () => {
    const json = JSON.stringify({ lex: [], vec: [], hyde: null });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.source, "heuristic");
  });

  it("rejects lex items that are too long", () => {
    const json = JSON.stringify({
      lex: ["ok", "a".repeat(60)],
      vec: ["What is the current project status?"],
      hyde: null,
    });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.lex.length, 1);
    assert.equal(result.lex[0], "ok");
  });

  it("rejects hyde that is too short", () => {
    const json = JSON.stringify({
      lex: ["report"],
      vec: [],
      hyde: "short",
    });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.hyde, null);
  });

  it("caps lex at 2 items", () => {
    const json = JSON.stringify({
      lex: ["budget review", "expense report", "cost analysis"],
      vec: ["What are the current budget items?"],
      hyde: null,
    });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.lex.length, 2);
  });

  it("caps vec at 1 item", () => {
    const json = JSON.stringify({
      lex: ["report"],
      vec: ["What is the report status?", "Is the report finished?"],
      hyde: null,
    });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.vec.length, 1);
  });

  it("falls back on non-object JSON", () => {
    const result = parseExpansionResponse("test", '"just a string"');
    assert.equal(result.source, "heuristic");
  });

  it("falls back on null JSON", () => {
    const result = parseExpansionResponse("test", "null");
    assert.equal(result.source, "heuristic");
  });
});

describe("flattenExpansion", () => {
  it("always includes original first", () => {
    const expanded: ExpandedQuery = {
      original: "my query",
      lex: [],
      vec: [],
      hyde: null,
      source: "heuristic",
    };
    const result = flattenExpansion(expanded);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "my query");
    assert.equal(result[0].type, "original");
  });

  it("includes all expansion types in order", () => {
    const expanded: ExpandedQuery = {
      original: "project update",
      lex: ["status report"],
      vec: ["What was the project update?"],
      hyde: "Sent project status report to the client on October 15 2025",
      source: "llm",
    };
    const result = flattenExpansion(expanded);
    assert.equal(result.length, 4);
    assert.equal(result[0].type, "original");
    assert.equal(result[1].type, "lex");
    assert.equal(result[2].type, "vec");
    assert.equal(result[3].type, "hyde");
  });

  it("caps total at 5 sub-queries", () => {
    const expanded: ExpandedQuery = {
      original: "query",
      lex: ["lex1", "lex2"],
      vec: ["vec question here"],
      hyde: "A hypothetical memory about the project delivery to the client",
      source: "llm",
    };
    const result = flattenExpansion(expanded);
    assert.ok(result.length <= 5, `Expected <= 5, got ${result.length}`);
  });

  it("prioritizes lex before vec before hyde when capping", () => {
    const expanded: ExpandedQuery = {
      original: "query",
      lex: ["lex1", "lex2"],
      vec: ["vec question here"],
      hyde: "A hypothetical memory about the project delivery to the client",
      source: "llm",
    };
    const result = flattenExpansion(expanded);
    const types = result.map((r) => r.type);
    assert.deepEqual(types, ["original", "lex", "lex", "vec", "hyde"]);
  });
});
