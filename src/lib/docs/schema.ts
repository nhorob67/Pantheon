import { z } from "zod";

export const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  section: z.string(),
  order: z.number(),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export interface DocPage {
  slug: string;
  frontmatter: Frontmatter;
  content: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  title: string;
  slug: string;
  icon?: string;
}

export const SECTION_ORDER = [
  "Getting Started",
  "Discord Integration",
  "AI Agents",
  "Tools",
  "Skills",
  "MCP Servers",
  "Integrations",
  "Extensions",
  "Billing & Usage",
  "Troubleshooting",
] as const;
