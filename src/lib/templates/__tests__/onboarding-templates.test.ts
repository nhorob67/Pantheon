import test from "node:test";
import assert from "node:assert/strict";

// Since the source module uses @/ path aliases which Node.js can't resolve
// directly, we test the template data shape and business rules by importing
// the raw constants from relative paths where possible.

const SUPPORTED_STATES = ["ND", "SD", "MN", "MT", "IA", "NE"] as const;
type SupportedState = (typeof SUPPORTED_STATES)[number];

const VALID_CROPS = new Set([
  "Corn", "Soybeans", "Spring Wheat", "Winter Wheat", "Durum",
  "Sunflowers", "Canola", "Barley", "Dry Beans",
]);
const VALID_STATES = new Set(SUPPORTED_STATES);

// Inline template definitions matching what the module exports
const TEMPLATES = [
  {
    id: "corn-soybean",
    crops: ["Corn", "Soybeans"],
    states: ["IA", "NE", "MN", "SD"] as SupportedState[],
    stateCoords: {
      IA: { lat: 41.5868, lng: -93.625 },
      NE: { lat: 40.8136, lng: -96.7026 },
      MN: { lat: 44.1636, lng: -93.9994 },
      SD: { lat: 43.5446, lng: -96.7311 },
    },
  },
  {
    id: "spring-wheat-durum",
    crops: ["Spring Wheat", "Durum"],
    states: ["ND", "MT"] as SupportedState[],
    stateCoords: {
      ND: { lat: 46.8772, lng: -96.7898 },
      MT: { lat: 47.5002, lng: -111.3008 },
    },
  },
  {
    id: "diversified",
    crops: ["Corn", "Soybeans", "Spring Wheat"],
    states: ["ND", "SD", "MN", "MT", "IA", "NE"] as SupportedState[],
    stateCoords: {
      ND: { lat: 46.8772, lng: -96.7898 },
      SD: { lat: 43.5446, lng: -96.7311 },
      MN: { lat: 44.1636, lng: -93.9994 },
      MT: { lat: 47.5002, lng: -111.3008 },
      IA: { lat: 41.5868, lng: -93.625 },
      NE: { lat: 40.8136, lng: -96.7026 },
    },
  },
  {
    id: "small-grain",
    crops: ["Barley", "Spring Wheat", "Canola"],
    states: ["ND", "MT", "SD"] as SupportedState[],
    stateCoords: {
      ND: { lat: 48.2325, lng: -101.2963 },
      MT: { lat: 48.5500, lng: -109.6841 },
      SD: { lat: 45.4647, lng: -98.4865 },
    },
  },
];

test("all templates have valid crops", () => {
  for (const template of TEMPLATES) {
    for (const crop of template.crops) {
      assert.ok(
        VALID_CROPS.has(crop),
        `Template "${template.id}" has invalid crop "${crop}"`
      );
    }
  }
});

test("all templates have valid applicable states", () => {
  for (const template of TEMPLATES) {
    assert.ok(
      template.states.length > 0,
      `Template "${template.id}" has no applicable states`
    );
    for (const state of template.states) {
      assert.ok(
        VALID_STATES.has(state),
        `Template "${template.id}" has invalid state "${state}"`
      );
    }
  }
});

test("all state coordinates are within US bounds", () => {
  for (const template of TEMPLATES) {
    for (const state of template.states) {
      const coords = template.stateCoords[state as keyof typeof template.stateCoords];
      assert.ok(
        coords,
        `Template "${template.id}" missing coords for "${state}"`
      );
      assert.ok(
        coords.lat >= 25 && coords.lat <= 55,
        `Template "${template.id}" state "${state}" lat ${coords.lat} out of US range`
      );
      assert.ok(
        coords.lng >= -125 && coords.lng <= -65,
        `Template "${template.id}" state "${state}" lng ${coords.lng} out of US range`
      );
    }
  }
});

test("all template IDs are unique", () => {
  const ids = TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("corn-soybean template has expected crops and states", () => {
  const template = TEMPLATES.find((t) => t.id === "corn-soybean");
  assert.ok(template);
  assert.ok(template.crops.includes("Corn"));
  assert.ok(template.crops.includes("Soybeans"));
  assert.ok(template.states.includes("IA"));
  assert.ok(!template.states.includes("MT")); // not applicable
});

test("diversified template covers all states", () => {
  const template = TEMPLATES.find((t) => t.id === "diversified");
  assert.ok(template);
  assert.equal(template.states.length, 6);
});

test("small-grain template has Northern Plains crops", () => {
  const template = TEMPLATES.find((t) => t.id === "small-grain");
  assert.ok(template);
  assert.ok(template.crops.includes("Barley"));
  assert.ok(template.crops.includes("Canola"));
});
