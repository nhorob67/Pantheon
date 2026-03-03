import type { TenantRole } from "../../types/tenant-runtime.ts";
import { executeRuntimeSafeTool } from "./tenant-runtime-safe-tools.ts";

interface ToolRequest {
  toolKey: string;
  args: Record<string, unknown>;
}

export interface ToolParityTranscriptCase {
  line: string;
  role: TenantRole;
  toolKey: string;
  expected: "pass" | "fail";
  actual: "pass" | "fail";
  output?: Record<string, unknown>;
  errorMessage?: string;
}

export interface ToolParityTranscriptSummary {
  total: number;
  passed: number;
  failed: number;
  byToolAndRole: Record<string, { pass: number; fail: number }>;
}

export interface ToolParityTranscriptResult {
  cases: ToolParityTranscriptCase[];
  summary: ToolParityTranscriptSummary;
  requiredToolFailures: number;
}

function extractJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // noop
  }
  return {};
}

function parseToolRequestFromContent(content: string): ToolRequest | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("/tool ")) {
    return null;
  }

  const body = trimmed.slice(6).trim();
  if (!body) {
    return null;
  }

  const firstSpace = body.indexOf(" ");
  if (firstSpace < 0) {
    return {
      toolKey: body,
      args: {},
    };
  }

  const toolKey = body.slice(0, firstSpace).trim();
  const argRaw = body.slice(firstSpace + 1).trim();
  return {
    toolKey,
    args: extractJsonObject(argRaw),
  };
}

async function executeTool(
  toolKey: string,
  args: Record<string, unknown>
): Promise<{ output: Record<string, unknown> }> {
  return executeRuntimeSafeTool(toolKey, args);
}

export async function runToolParityTranscriptHarness(input: {
  transcript: string;
  role: TenantRole;
  requiredTools?: string[];
}): Promise<ToolParityTranscriptResult> {
  const requiredTools = new Set(input.requiredTools || []);
  const cases: ToolParityTranscriptCase[] = [];
  const byToolAndRole: Record<string, { pass: number; fail: number }> = {};
  let requiredToolFailures = 0;

  const lines = input.transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const parsed = parseToolRequestFromContent(line);
    if (!parsed) {
      continue;
    }

    const scoreKey = `${parsed.toolKey}:${input.role}`;
    if (!byToolAndRole[scoreKey]) {
      byToolAndRole[scoreKey] = { pass: 0, fail: 0 };
    }

    try {
      const executed = await executeTool(parsed.toolKey, parsed.args);
      byToolAndRole[scoreKey].pass += 1;
      cases.push({
        line,
        role: input.role,
        toolKey: parsed.toolKey,
        expected: "pass",
        actual: "pass",
        output: executed.output,
      });
    } catch (error) {
      byToolAndRole[scoreKey].fail += 1;
      if (requiredTools.has(parsed.toolKey)) {
        requiredToolFailures += 1;
      }
      cases.push({
        line,
        role: input.role,
        toolKey: parsed.toolKey,
        expected: requiredTools.has(parsed.toolKey) ? "pass" : "fail",
        actual: "fail",
        errorMessage: error instanceof Error ? error.message : "Tool parity execution failed",
      });
    }
  }

  const passed = cases.filter((entry) => entry.actual === "pass").length;
  const failed = cases.length - passed;

  return {
    cases,
    summary: {
      total: cases.length,
      passed,
      failed,
      byToolAndRole,
    },
    requiredToolFailures,
  };
}
