"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SkillTemplate } from "@/types/custom-skill";
import { SkillAiGenerator } from "@/components/settings/skill-ai-generator";
import { SkillTemplatePicker } from "@/components/settings/skill-template-picker";
import { Sparkles, Wrench, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type CreationPath = null | "ai" | "manual";

interface NewSkillClientProps {
  templates: SkillTemplate[];
}

export function NewSkillClient({ templates }: NewSkillClientProps) {
  const router = useRouter();
  const [path, setPath] = useState<CreationPath>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSkillFromMd = async (skillMd: string) => {
    setCreating(true);
    setError(null);

    // Extract name from frontmatter
    const nameMatch = skillMd.match(/^name:\s*(.+)$/m);
    const descMatch = skillMd.match(/^description:\s*(.+)$/m);
    const slug = nameMatch ? nameMatch[1].trim() : `custom-skill-${Date.now()}`;
    const displayName = slug
      .replace("custom-", "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      const res = await fetch("/api/custom-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          display_name: displayName,
          description: descMatch ? descMatch[1].trim() : undefined,
          skill_md: skillMd,
          status: "draft",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create skill");
        setCreating(false);
        return;
      }

      const data = await res.json();
      router.push(`/settings/skills/forge/${data.skill.id}`);
    } catch {
      setError("Failed to create skill");
      setCreating(false);
    }
  };

  const createFromTemplate = async (template: SkillTemplate) => {
    await createSkillFromMd(template.starter_skill_md);
  };

  return (
    <div>
      {/* Back link */}
      <Link
        href="/settings/skills/forge"
        className="inline-flex items-center gap-1.5 text-sm text-text-dim hover:text-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Skill Forge
      </Link>

      <h3 className="font-headline text-lg font-semibold mb-1">Create a Skill</h3>
      <p className="text-foreground/60 text-sm mb-8">
        Choose how you want to build your custom skill
      </p>

      {/* Path selection */}
      {path === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setPath("ai")}
            className="flex flex-col items-start gap-4 rounded-xl border border-border hover:border-accent/40 p-6 text-left transition-all cursor-pointer group hover:bg-accent-dim"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-dim flex items-center justify-center group-hover:bg-accent/20">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="font-headline text-base font-semibold text-text-primary">Describe It</p>
              <p className="text-sm text-text-dim mt-1">
                Tell us what you need and AI will generate a complete skill definition
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPath("manual")}
            className="flex flex-col items-start gap-4 rounded-xl border border-border hover:border-green-bright/40 p-6 text-left transition-all cursor-pointer group hover:bg-green-dim"
          >
            <div className="w-12 h-12 rounded-xl bg-green-dim flex items-center justify-center group-hover:bg-green-bright/20">
              <Wrench className="w-6 h-6 text-green-bright" />
            </div>
            <div>
              <p className="font-headline text-base font-semibold text-text-primary">Build It</p>
              <p className="text-sm text-text-dim mt-1">
                Start from a template or blank slate and write the skill yourself
              </p>
            </div>
          </button>
        </div>
      )}

      {/* AI path */}
      {path === "ai" && (
        <div>
          <button
            type="button"
            onClick={() => setPath(null)}
            className="text-sm text-text-dim hover:text-text-secondary transition-colors mb-4 cursor-pointer"
          >
            &larr; Change creation method
          </button>
          <SkillAiGenerator
            templates={templates}
            onGenerated={createSkillFromMd}
          />
        </div>
      )}

      {/* Manual path */}
      {path === "manual" && (
        <div>
          <button
            type="button"
            onClick={() => setPath(null)}
            className="text-sm text-text-dim hover:text-text-secondary transition-colors mb-4 cursor-pointer"
          >
            &larr; Change creation method
          </button>

          <p className="text-sm text-text-secondary mb-4">
            Choose a template to start with, or create a blank skill
          </p>

          {/* Blank option */}
          <button
            type="button"
            onClick={() =>
              createSkillFromMd(
                `---\nname: custom-my-skill\ndescription: A custom skill\nuser-invocable: true\n---\n\n# My Custom Skill\n\n## Purpose\nDescribe what this skill does.\n\n## Instructions\nAdd instructions for your assistant here.\n`
              )
            }
            disabled={creating}
            className="w-full rounded-xl border border-border border-dashed hover:border-border-light p-4 text-left transition-colors cursor-pointer mb-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-text-dim" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Blank Skill</p>
              <p className="text-xs text-text-dim">Start with a minimal template</p>
            </div>
          </button>

          <SkillTemplatePicker
            templates={templates}
            onSelect={createFromTemplate}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mt-4">{error}</p>
      )}

      {/* Creating indicator */}
      {creating && (
        <div className="flex items-center gap-2 text-sm text-accent mt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Creating skill...
        </div>
      )}
    </div>
  );
}
