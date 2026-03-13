import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { frontmatterSchema, type DocPage } from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

function getMdxFiles(dir: string, base = ""): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMdxFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(rel);
    }
  }

  return files;
}

function fileToSlug(filePath: string): string {
  return filePath
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "")
    .split(path.sep)
    .join("/");
}

const SAFE_SLUG_RE = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export function getDocBySlug(slug: string): DocPage | null {
  if (!SAFE_SLUG_RE.test(slug)) return null;

  const candidates = [
    path.join(CONTENT_DIR, `${slug}.mdx`),
    path.join(CONTENT_DIR, slug, "index.mdx"),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const parsed = frontmatterSchema.safeParse(data);
      if (!parsed.success) return null;
      return { slug, frontmatter: parsed.data, content };
    }
  }

  return null;
}

export function getAllDocs(): DocPage[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = getMdxFiles(CONTENT_DIR);
  const docs: DocPage[] = [];

  for (const file of files) {
    const slug = fileToSlug(file);
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const parsed = frontmatterSchema.safeParse(data);
    if (parsed.success) {
      docs.push({ slug, frontmatter: parsed.data, content });
    }
  }

  return docs;
}
