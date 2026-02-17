"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CustomSkill, CustomSkillVersion } from "@/types/custom-skill";
import { SkillForgeLayout } from "@/components/settings/skill-forge-layout";
import { SkillMdEditor } from "@/components/settings/skill-md-editor";
import { SkillPreview } from "@/components/settings/skill-preview";
import { SkillTestPanel } from "@/components/settings/skill-test-panel";
import { SkillVersionHistory } from "@/components/settings/skill-version-history";
import { SkillIconPicker } from "@/components/settings/skill-icon-picker";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save, Play, Square } from "lucide-react";
import Link from "next/link";

type RightTab = "preview" | "test" | "history";

const statusBadge: Record<string, { label: string; variant: "success" | "warning" | "neutral" }> = {
  draft: { label: "DRAFT", variant: "neutral" },
  active: { label: "ACTIVE", variant: "success" },
  archived: { label: "ARCHIVED", variant: "neutral" },
};

export default function SkillEditorPage() {
  const params = useParams();
  const router = useRouter();
  const skillId = params.id as string;

  const [skill, setSkill] = useState<CustomSkill | null>(null);
  const [versions, setVersions] = useState<CustomSkillVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("preview");

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Puzzle");
  const [skillMd, setSkillMd] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSkill = useCallback(async () => {
    const res = await fetch(`/api/custom-skills/${skillId}`);
    if (!res.ok) {
      router.push("/settings/skills/forge");
      return;
    }
    const data = await res.json();
    setSkill(data.skill);
    setVersions(data.versions || []);
    setDisplayName(data.skill.display_name);
    setDescription(data.skill.description || "");
    setIcon(data.skill.icon);
    setSkillMd(data.skill.skill_md);
    setHasChanges(false);
    setLoading(false);
  }, [skillId, router]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  const handleFieldChange = (
    setter: (v: string) => void,
    value: string
  ) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!skill) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/custom-skills/${skillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          description: description || undefined,
          icon,
          skill_md: skillMd,
          change_summary: "Manual edit",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      const data = await res.json();
      setSkill(data.skill);
      setHasChanges(false);
      setSuccess(data.warning || "Skill saved");

      // Refresh version history
      const vRes = await fetch(`/api/custom-skills/${skillId}`);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVersions(vData.versions || []);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!skill) return;
    const newStatus = skill.status === "active" ? "draft" : "active";
    setActivating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/custom-skills/${skillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          skill_md: skillMd,
          change_summary: newStatus === "active" ? "Activated skill" : "Deactivated skill",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update status");
        return;
      }

      const data = await res.json();
      setSkill(data.skill);
      setHasChanges(false);
      setSuccess(
        newStatus === "active"
          ? data.warning || "Skill activated — deploying..."
          : "Skill deactivated"
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to update status");
    } finally {
      setActivating(false);
    }
  };

  const handleRollback = async (version: CustomSkillVersion) => {
    const res = await fetch(
      `/api/custom-skills/${skillId}/versions/${version.id}/rollback`,
      { method: "POST" }
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Rollback failed");
    }

    const data = await res.json();
    setSkill(data.skill);
    setSkillMd(data.skill.skill_md);
    setHasChanges(false);
    setSuccess("Rolled back successfully");
    setTimeout(() => setSuccess(null), 3000);

    // Refresh versions
    await fetchSkill();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-text-dim" />
      </div>
    );
  }

  if (!skill) return null;

  const status = statusBadge[skill.status] || statusBadge.draft;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings/skills/forge"
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Badge variant={status.variant}>{status.label}</Badge>
          {hasChanges && (
            <span className="text-xs text-accent">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium border border-border text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>

          {/* Activate / Deactivate */}
          {skill.status !== "archived" && (
            <button
              type="button"
              onClick={handleStatusToggle}
              disabled={activating}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                skill.status === "active"
                  ? "bg-white/5 text-text-secondary hover:bg-white/10"
                  : "bg-accent hover:bg-accent-light text-bg-deep"
              }`}
            >
              {activating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : skill.status === "active" ? (
                <Square className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {skill.status === "active" ? "Deactivate" : "Activate"}
            </button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {success && <p className="text-green-400 text-sm mb-4">{success}</p>}

      {/* Metadata bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl bg-bg-card border border-border">
        <SkillIconPicker value={icon} onChange={(v) => handleFieldChange(setIcon, v)} />

        <div className="flex-1 min-w-[200px]">
          <input
            value={displayName}
            onChange={(e) => handleFieldChange(setDisplayName, e.target.value)}
            placeholder="Skill name"
            className="w-full bg-transparent text-text-primary font-headline font-semibold outline-none text-base placeholder:text-text-dim"
          />
        </div>

        <div className="w-full sm:w-auto sm:flex-1 min-w-[200px]">
          <input
            value={description}
            onChange={(e) => handleFieldChange(setDescription, e.target.value)}
            placeholder="Short description..."
            className="w-full bg-transparent text-text-secondary outline-none text-sm placeholder:text-text-dim"
          />
        </div>

        <span className="text-xs text-text-dim font-mono">{skill.slug}</span>
      </div>

      {/* Split pane: Editor / Preview+Test+History */}
      <SkillForgeLayout
        leftLabel="Editor"
        rightLabel={rightTab === "preview" ? "Preview" : rightTab === "test" ? "Test" : "History"}
        left={
          <SkillMdEditor
            value={skillMd}
            onChange={(v) => handleFieldChange(setSkillMd, v)}
            disabled={skill.status === "archived"}
          />
        }
        right={
          <div>
            {/* Tab bar */}
            <div className="flex border-b border-border mb-4">
              {(["preview", "test", "history"] as RightTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRightTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors capitalize cursor-pointer ${
                    rightTab === tab
                      ? "text-accent border-b-2 border-accent"
                      : "text-text-dim hover:text-text-secondary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {rightTab === "preview" && (
              <div className="rounded-lg border border-border bg-bg-card p-6 overflow-y-auto max-h-[600px]">
                <SkillPreview skillMd={skillMd} />
              </div>
            )}

            {rightTab === "test" && (
              <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
                <SkillTestPanel
                  skillId={skillId}
                  skillStatus={skill.status}
                />
              </div>
            )}

            {rightTab === "history" && (
              <SkillVersionHistory
                skillId={skillId}
                versions={versions}
                currentSkillMd={skillMd}
                onRollback={handleRollback}
              />
            )}
          </div>
        }
      />
    </div>
  );
}
