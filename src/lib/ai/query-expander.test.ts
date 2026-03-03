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
      lex: ["corn delivery", "grain hauling"],
      vec: ["Where did we deliver corn last fall?"],
      hyde: "Delivered 5000 bushels of corn to CHS elevator in Fargo on Oct 15.",
    });
    const result = parseExpansionResponse("corn delivery", json);
    assert.equal(result.source, "llm");
    assert.equal(result.original, "corn delivery");
    assert.deepEqual(result.lex, ["corn delivery", "grain hauling"]);
    assert.deepEqual(result.vec, ["Where did we deliver corn last fall?"]);
    assert.ok(result.hyde !== null);
  });

  it("falls back on malformed JSON", () => {
    const result = parseExpansionResponse("test query", "not json at all");
    assert.equal(result.source, "heuristic");
    assert.equal(result.original, "test query");
  });

  it("strips markdown fences", () => {
    const json = '```json\n{"lex":["corn bid"],"vec":["What is the corn bid?"],"hyde":null}\n```';
    const result = parseExpansionResponse("corn bid", json);
    assert.equal(result.source, "llm");
    assert.deepEqual(result.lex, ["corn bid"]);
  });

  it("falls back when all fields are empty", () => {
    const json = JSON.stringify({ lex: [], vec: [], hyde: null });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.source, "heuristic");
  });

  it("rejects lex items that are too long", () => {
    const json = JSON.stringify({
      lex: ["ok", "a".repeat(60)],
      vec: ["What is the corn price today?"],
      hyde: null,
    });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.lex.length, 1);
    assert.equal(result.lex[0], "ok");
  });

  it("rejects hyde that is too short", () => {
    const json = JSON.stringify({
      lex: ["corn"],
      vec: [],
      hyde: "short",
    });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.hyde, null);
  });

  it("caps lex at 2 items", () => {
    const json = JSON.stringify({
      lex: ["corn bid", "soybean basis", "wheat price"],
      vec: ["What are current grain bids?"],
      hyde: null,
    });
    const result = parseExpansionResponse("test", json);
    assert.equal(result.lex.length, 2);
  });

  it("caps vec at 1 item", () => {
    const json = JSON.stringify({
      lex: ["corn"],
      vec: ["What is the corn price?", "How much is corn today?"],
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
      original: "corn delivery",
      lex: ["corn hauling"],
      vec: ["Where was corn delivered?"],
      hyde: "Delivered corn to CHS elevator in Fargo on October 15 2025",
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
      hyde: "A hypothetical memory about corn delivery to the elevator",
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
      hyde: "A hypothetical memory about corn delivery to the elevator",
      source: "llm",
    };
    const result = flattenExpansion(expanded);
    const types = result.map((r) => r.type);
    assert.deepEqual(types, ["original", "lex", "lex", "vec", "hyde"]);
  });
});
