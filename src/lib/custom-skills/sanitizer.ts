import matter from "gray-matter";

const MAX_SKILL_MD_SIZE = 50_000;
const MAX_REFERENCE_SIZE = 50_000;
const MAX_REFERENCES = 10;
const MAX_CUSTOM_SKILLS_PER_CUSTOMER = 20;

const BLOCKED_YAML_KEY_PATHS = [
  ["metadata", "openclaw", "install"],
  ["metadata", "openclaw", "requires", "bins"],
];

const ALLOWED_FRONTMATTER_KEYS = new Set([
  "name",
  "description",
  "user-invocable",
  "disable-model-invocation",
  "metadata",
]);

interface SanitizeResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

function stripNonUtf8(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function hasNestedKey(obj: unknown, keyPath: string[]): boolean {
  let current: unknown = obj;
  for (const key of keyPath) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return false;
    }
    if (!(key in (current as Record<string, unknown>))) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return true;
}

function validateFrontmatter(skillMd: string, expectedSlug: string): string | null {
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(skillMd);
  } catch {
    return "Invalid YAML frontmatter";
  }

  const data = parsed.data as Record<string, unknown>;

  // Check for blocked key paths
  for (const keyPath of BLOCKED_YAML_KEY_PATHS) {
    if (hasNestedKey(data, keyPath)) {
      return `Blocked YAML key: ${keyPath.join(".")}`;
    }
  }

  // Check that name field matches slug
  if (typeof data["name"] === "string") {
    const name = data["name"].trim();
    if (name !== expectedSlug) {
      return `YAML name field must match slug "${expectedSlug}", got "${name}"`;
    }
  }

  // Check for unknown top-level keys
  for (const key of Object.keys(data)) {
    if (!ALLOWED_FRONTMATTER_KEYS.has(key)) {
      return `Unknown frontmatter key: "${key}". Allowed: ${[...ALLOWED_FRONTMATTER_KEYS].join(", ")}`;
    }
  }

  return null;
}

export function sanitizeSkillMd(skillMd: string, slug: string): SanitizeResult {
  if (!skillMd || typeof skillMd !== "string") {
    return { valid: false, error: "skill_md is required" };
  }

  const cleaned = stripNonUtf8(skillMd);

  if (cleaned.length < 10) {
    return { valid: false, error: "skill_md must be at least 10 characters" };
  }
  if (cleaned.length > MAX_SKILL_MD_SIZE) {
    return { valid: false, error: `skill_md exceeds ${MAX_SKILL_MD_SIZE} character limit` };
  }

  // Validate frontmatter if present (gray-matter handles extraction)
  if (cleaned.startsWith("---\n")) {
    const fmError = validateFrontmatter(cleaned, slug);
    if (fmError) {
      return { valid: false, error: fmError };
    }
  }

  return { valid: true, sanitized: cleaned };
}

export function sanitizeReferences(
  refs: Record<string, string> | undefined
): SanitizeResult {
  if (!refs || Object.keys(refs).length === 0) {
    return { valid: true };
  }

  const entries = Object.entries(refs);

  if (entries.length > MAX_REFERENCES) {
    return { valid: false, error: `Maximum ${MAX_REFERENCES} reference files allowed` };
  }

  for (const [filename, content] of entries) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(filename)) {
      return { valid: false, error: `Invalid reference filename: "${filename}"` };
    }
    if (typeof content !== "string") {
      return { valid: false, error: `Reference "${filename}" content must be a string` };
    }
    if (content.length > MAX_REFERENCE_SIZE) {
      return { valid: false, error: `Reference "${filename}" exceeds ${MAX_REFERENCE_SIZE} character limit` };
    }
  }

  return { valid: true };
}

export async function checkSkillLimit(
  countFn: () => Promise<number>
): Promise<string | null> {
  const count = await countFn();
  if (count >= MAX_CUSTOM_SKILLS_PER_CUSTOMER) {
    return `Maximum ${MAX_CUSTOM_SKILLS_PER_CUSTOMER} custom skills per customer`;
  }
  return null;
}
