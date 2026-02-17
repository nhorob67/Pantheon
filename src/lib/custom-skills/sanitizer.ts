const MAX_SKILL_MD_SIZE = 50_000;
const MAX_REFERENCE_SIZE = 50_000;
const MAX_REFERENCES = 10;
const MAX_CUSTOM_SKILLS_PER_CUSTOMER = 20;

const BLOCKED_YAML_KEYS = [
  "metadata.openclaw.install",
  "metadata.openclaw.requires.bins",
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

function extractFrontmatter(skillMd: string): { frontmatter: string; body: string } | null {
  const match = skillMd.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

function validateFrontmatter(frontmatter: string, expectedSlug: string): string | null {
  // Check for blocked keys
  for (const blocked of BLOCKED_YAML_KEYS) {
    const keyParts = blocked.split(".");
    const leafKey = keyParts[keyParts.length - 1];
    // Simple check: look for the key pattern in the YAML text
    if (new RegExp(`^\\s*${leafKey}\\s*:`, "m").test(frontmatter)) {
      // Walk the context to see if it's under the blocked path
      const fullPattern = keyParts.map((k) => `${k}\\s*:`).join("[\\s\\S]*?");
      if (new RegExp(fullPattern, "m").test(frontmatter)) {
        return `Blocked YAML key: ${blocked}`;
      }
    }
  }

  // Check that name field matches slug
  const nameMatch = frontmatter.match(/^name\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (name !== expectedSlug) {
      return `YAML name field must match slug "${expectedSlug}", got "${name}"`;
    }
  }

  // Check for unknown top-level keys
  const topLevelKeys = frontmatter
    .split("\n")
    .filter((line) => /^[a-z]/.test(line))
    .map((line) => line.split(":")[0].trim());

  for (const key of topLevelKeys) {
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

  // Validate frontmatter if present
  const parsed = extractFrontmatter(cleaned);
  if (parsed) {
    const fmError = validateFrontmatter(parsed.frontmatter, slug);
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
