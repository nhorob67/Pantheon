export interface TocEntry {
  id: string;
  title: string;
  level: 2 | 3;
}

export function extractHeadings(raw: string): TocEntry[] {
  const headings: TocEntry[] = [];
  const lines = raw.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const title = match[2].trim();
    const id = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    headings.push({ id, title, level });
  }

  return headings;
}
