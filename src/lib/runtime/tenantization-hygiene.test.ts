import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const TARGET_DIRECTORIES = [
  "src/components/dashboard",
  "src/components/settings",
  "src/app/(dashboard)/dashboard",
  "src/app/(dashboard)/settings",
  "src/hooks",
];

const EXCLUDED_PATH_SEGMENTS = [
  `${path.sep}workflows${path.sep}`,
];

const TARGET_EXTENSIONS = new Set([".ts", ".tsx"]);
const LEGACY_INSTANCE_API_PATTERN = /\/api\/instances\//;

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

function isExcludedFile(filePath: string): boolean {
  return EXCLUDED_PATH_SEGMENTS.some((segment) => filePath.includes(segment));
}

test("non-workflow dashboard/settings surfaces avoid legacy /api/instances endpoints", () => {
  const root = process.cwd();
  const candidateFiles = TARGET_DIRECTORIES.flatMap((directory) =>
    listFilesRecursively(path.join(root, directory))
  );

  const violations: string[] = [];

  for (const filePath of candidateFiles) {
    if (isExcludedFile(filePath)) {
      continue;
    }

    const relativePath = path.relative(root, filePath);
    const lines = fs.readFileSync(filePath, "utf8").split("\n");

    lines.forEach((line, index) => {
      if (LEGACY_INSTANCE_API_PATTERN.test(line)) {
        violations.push(`${relativePath}:${index + 1}`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    "Found legacy /api/instances usage in non-workflow dashboard/settings code paths:\n" +
      violations.join("\n")
  );
});
