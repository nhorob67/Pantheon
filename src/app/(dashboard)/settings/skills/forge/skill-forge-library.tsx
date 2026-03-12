"use client";

import { useState } from "react";
import type { CustomSkill } from "@/types/custom-skill";
import { CustomSkillCard } from "@/components/settings/custom-skill-card";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, Anvil } from "lucide-react";
import Link from "next/link";

interface SkillForgeLibraryProps {
  initialSkills: CustomSkill[];
}

export function SkillForgeLibrary({ initialSkills }: SkillForgeLibraryProps) {
  const [skills, setSkills] = useState(initialSkills);
  const [deleteTarget, setDeleteTarget] = useState<CustomSkill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/custom-skills/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (skills.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-accent-dim flex items-center justify-center mx-auto mb-4">
          <Anvil className="w-8 h-8 text-accent" />
        </div>
        <h4 className="font-headline text-lg font-semibold text-text-primary mb-2">
          Forge your first custom skill
        </h4>
        <p className="text-sm text-text-dim max-w-md mx-auto mb-6">
          Create custom abilities for your agents — from status reports to project tracking,
          alerts, and anything else your team needs.
        </p>
        <Link
          href="/settings/skills/forge/new"
          className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors inline-flex items-center gap-2"
        >
          Create Your First Skill
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {skills.map((skill) => (
          <CustomSkillCard
            key={skill.id}
            skill={skill}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Archive Skill"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will archive <strong>{deleteTarget?.display_name}</strong> and remove it from all agents.
            {deleteTarget?.status === "active" && " A redeploy will be triggered."}
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive/20 hover:bg-destructive/30 text-destructive font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Archive
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
