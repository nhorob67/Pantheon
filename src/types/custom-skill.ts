export interface CustomSkill {
  id: string;
  customer_id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon: string;
  skill_md: string;
  references: Record<string, string>;
  config_schema: Record<string, unknown>;
  config: Record<string, unknown>;
  status: "draft" | "active" | "archived";
  template_id: string | null;
  generation_metadata: GenerationMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface CustomSkillVersion {
  id: string;
  skill_id: string;
  version: number;
  skill_md: string;
  references: Record<string, string> | null;
  config: Record<string, unknown> | null;
  change_summary: string | null;
  created_at: string;
}

export interface GenerationMetadata {
  prompt: string;
  model: string;
  template_id?: string;
  generated_at: string;
}

export type SkillTemplateCategory =
  | "customer-support"
  | "financial"
  | "project-management"
  | "productivity"
  | "operations";

export interface SkillTemplate {
  id: string;
  name: string;
  category: SkillTemplateCategory;
  description: string;
  icon: string;
  prompt_hint: string;
  starter_skill_md: string;
}

export interface CustomSkillWithVersions extends CustomSkill {
  versions: CustomSkillVersion[];
}
