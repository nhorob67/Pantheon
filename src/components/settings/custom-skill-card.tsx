"use client";

import type { CustomSkill } from "@/types/custom-skill";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Puzzle } from "lucide-react";
import Link from "next/link";

const statusBadge: Record<string, { label: string; variant: "success" | "warning" | "neutral" }> = {
  draft: { label: "DRAFT", variant: "neutral" },
  active: { label: "ACTIVE", variant: "success" },
  archived: { label: "ARCHIVED", variant: "neutral" },
};

interface CustomSkillCardProps {
  skill: CustomSkill;
  onDelete: (skill: CustomSkill) => void;
}

export function CustomSkillCard({ skill, onDelete }: CustomSkillCardProps) {
  const status = statusBadge[skill.status] || statusBadge.draft;

  return (
    <div className="group relative bg-bg-card rounded-xl border border-border shadow-sm p-5 transition-all hover:bg-bg-card-hover hover:-translate-y-0.5 hover:shadow-md hover:border-border-light">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center shrink-0">
            <Puzzle className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <h4 className="font-headline text-sm font-semibold text-text-primary truncate">
              {skill.display_name}
            </h4>
            <p className="text-xs text-text-dim font-mono">{skill.slug}</p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {skill.description && (
        <p className="text-xs text-text-secondary leading-relaxed mb-4 line-clamp-2">
          {skill.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-dim">
          {new Date(skill.updated_at).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1">
          <Link
            href={`/settings/skills/forge/${skill.id}`}
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
            aria-label={`Edit ${skill.display_name}`}
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(skill)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            aria-label={`Delete ${skill.display_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
