import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const TARGET_DIRECTORIES = [
  "src/lib/workflows",
  "src/components/workflows",
  "src/app/api/tenants/[tenantId]/workflows",
  "src/app/(dashboard)/settings/workflows",
];

const TARGET_EXTENSIONS = new Set([".ts", ".tsx"]);
const TODO_PATTERN = /\b(?:TODO|FIXME)\b/;

function listFilesRecursively(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
      continue;
    }

    if (entry.isFile() && TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

test("workflow code paths contain no TODO/FIXME markers", () => {
  const root = process.cwd();
  const candidateFiles = TARGET_DIRECTORIES.flatMap((directory) =>
    listFilesRecursively(path.join(root, directory))
  );

  const violations: string[] = [];

  for (const filePath of candidateFiles) {
    const relativePath = path.relative(root, filePath);
    if (relativePath.endsWith("workflow-hygiene.test.ts")) {
      continue;
    }

    const contents = fs.readFileSync(filePath, "utf8");
    const lines = contents.split("\n");

    lines.forEach((line, index) => {
      if (TODO_PATTERN.test(line)) {
        violations.push(`${relativePath}:${index + 1}`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Found disallowed TODO/FIXME markers in workflow paths:\n${violations.join("\n")}`
  );
});
