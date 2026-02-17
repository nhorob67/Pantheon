import { getAllDocs } from "./content";
import { SECTION_ORDER, type NavSection } from "./schema";

export function buildNavigation(): NavSection[] {
  const docs = getAllDocs();
  const sectionMap = new Map<string, NavSection>();

  for (const doc of docs) {
    const sectionTitle = doc.frontmatter.section;
    if (!sectionMap.has(sectionTitle)) {
      sectionMap.set(sectionTitle, { title: sectionTitle, items: [] });
    }
    sectionMap.get(sectionTitle)!.items.push({
      title: doc.frontmatter.title,
      slug: doc.slug,
      icon: doc.frontmatter.icon,
    });
  }

  // Sort items within each section by order
  for (const section of sectionMap.values()) {
    const orderMap = new Map<string, number>();
    for (const doc of docs) {
      orderMap.set(doc.slug, doc.frontmatter.order);
    }
    section.items.sort(
      (a, b) => (orderMap.get(a.slug) ?? 99) - (orderMap.get(b.slug) ?? 99)
    );
  }

  // Sort sections by SECTION_ORDER
  const ordered: NavSection[] = [];
  for (const sectionTitle of SECTION_ORDER) {
    const section = sectionMap.get(sectionTitle);
    if (section) ordered.push(section);
  }
  // Append any sections not in SECTION_ORDER
  for (const [title, section] of sectionMap) {
    if (!SECTION_ORDER.includes(title as (typeof SECTION_ORDER)[number])) {
      ordered.push(section);
    }
  }

  return ordered;
}

export function getAdjacentDocs(currentSlug: string) {
  const nav = buildNavigation();
  const allItems = nav.flatMap((s) => s.items);
  const idx = allItems.findIndex((item) => item.slug === currentSlug);

  return {
    prev: idx > 0 ? allItems[idx - 1] : null,
    next: idx < allItems.length - 1 ? allItems[idx + 1] : null,
  };
}
