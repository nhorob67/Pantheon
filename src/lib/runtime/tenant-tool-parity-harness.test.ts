import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runToolParityTranscriptHarness } from "./tenant-tool-parity-harness.ts";
import type { TenantRole } from "../../types/tenant-runtime.ts";

interface TranscriptFixture {
  name: string;
  role: TenantRole;
  required_tools: string[];
  transcript: string;
}

function loadFixtures(): TranscriptFixture[] {
  const raw = readFileSync(
    new URL("./__fixtures__/tenant-tool-parity-transcripts.json", import.meta.url),
    "utf8"
  );
  return JSON.parse(raw) as TranscriptFixture[];
}

test("tool parity harness tracks pass/fail counts by tool and tenant role", async () => {
  const fixtures = loadFixtures();
  const aggregateByToolRole = new Map<string, { pass: number; fail: number }>();

  for (const fixture of fixtures) {
    const result = await runToolParityTranscriptHarness({
      transcript: fixture.transcript,
      role: fixture.role,
      requiredTools: fixture.required_tools,
    });

    for (const [key, counts] of Object.entries(result.summary.byToolAndRole)) {
      const current = aggregateByToolRole.get(key) || { pass: 0, fail: 0 };
      current.pass += counts.pass;
      current.fail += counts.fail;
      aggregateByToolRole.set(key, current);
    }

    if (fixture.name === "unsupported-tool-detected") {
      assert.ok(
        result.cases.some((entry) => entry.toolKey === "non_existing_tool" && entry.actual === "fail")
      );
    }
  }

  assert.ok(aggregateByToolRole.get("echo:operator")?.pass);
  assert.ok(aggregateByToolRole.get("time:viewer")?.pass);
});

test("high-usage required tools remain regression-gated by transcript harness", async () => {
  const fixtures = loadFixtures();
  const highUsageTools = ["echo", "time", "hash"];

  for (const fixture of fixtures) {
    const result = await runToolParityTranscriptHarness({
      transcript: fixture.transcript,
      role: fixture.role,
      requiredTools: highUsageTools,
    });

    if (fixture.name === "unsupported-tool-detected") {
      assert.equal(
        result.requiredToolFailures,
        0,
        "unsupported fixture must not fail required high-usage tool coverage"
      );
      continue;
    }

    assert.equal(
      result.requiredToolFailures,
      0,
      `${fixture.name} introduced required-tool regression`
    );
  }
});
