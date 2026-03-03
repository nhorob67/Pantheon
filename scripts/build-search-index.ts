import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { stripMdx } from "../src/lib/docs/strip-mdx.ts";

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");
const OUTPUT = path.join(process.cwd(), "public", "search-index.json");

interface SearchEntry {
  slug: string;
  title: string;
  section: string;
  headings: { id: string; title: string }[];
  body: string;
}

function getMdxFiles(dir: string, base = ""): string[] {
  if (!fs.existsSync(dir)) return [];
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

function extractHeadings(
  content: string
): { id: string; title: string }[] {
  const headings: { id: string; title: string }[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;
    const title = match[2].trim();
    const id = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ id, title });
  }

  return headings;
}

function main() {
  const files = getMdxFiles(CONTENT_DIR);
  const entries: SearchEntry[] = [];

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    if (!data.title || !data.section) continue;

    entries.push({
      slug: fileToSlug(file),
      title: data.title,
      section: data.section,
      headings: extractHeadings(content),
      body: stripMdx(content),
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2));
  console.log(`Search index built: ${entries.length} entries → ${OUTPUT}`);
}

main();
