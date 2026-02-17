"use client";

import { useState } from "react";
import type { CustomSkillVersion } from "@/types/custom-skill";
import { RotateCcw, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

interface SkillVersionHistoryProps {
  skillId: string;
  versions: CustomSkillVersion[];
  currentSkillMd: string;
  onRollback: (version: CustomSkillVersion) => Promise<void>;
}

export function SkillVersionHistory({
  skillId: _skillId,
  versions,
  currentSkillMd,
  onRollback,
}: SkillVersionHistoryProps) {
  const [confirmVersion, setConfirmVersion] = useState<CustomSkillVersion | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleRollback = async () => {
    if (!confirmVersion) return;
    setRolling(true);
    try {
      await onRollback(confirmVersion);
      setConfirmVersion(null);
    } finally {
      setRolling(false);
    }
  };

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-dim text-sm">
        No version history yet
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {versions.map((v, i) => {
          const isCurrent = i === 0;
          const isChanged = v.skill_md !== currentSkillMd;

          return (
            <div
              key={v.id}
              className={`rounded-lg border p-4 ${
                isCurrent
                  ? "border-accent/30 bg-accent-dim"
                  : "border-border bg-bg-deep"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? "bg-accent text-bg-deep"
                        : "bg-white/5 text-text-dim"
                    }`}
                  >
                    v{v.version}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isCurrent ? "text-text-primary" : "text-text-secondary"}`}>
                      Version {v.version}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-accent font-normal">Current</span>
                      )}
                    </p>
                    <p className="text-xs text-text-dim">
                      {new Date(v.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!isCurrent && isChanged && (
                  <button
                    type="button"
                    onClick={() => setConfirmVersion(v)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rollback
                  </button>
                )}
              </div>

              {v.change_summary && (
                <p className="text-xs text-text-dim mt-2 ml-11">
                  {v.change_summary}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Rollback confirmation */}
      <Dialog
        open={!!confirmVersion}
        onClose={() => setConfirmVersion(null)}
        title="Rollback to Earlier Version"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will restore version {confirmVersion?.version} and create a new version recording the rollback.
            {" "}If the skill is active, a new deploy will be triggered.
          </p>

          {/* Diff preview: show first few lines */}
          {confirmVersion && (
            <div className="rounded-lg border border-border bg-bg-deep p-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-text-dim font-mono uppercase tracking-wider mb-2">
                Version {confirmVersion.version} content (first 20 lines)
              </p>
              <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                {confirmVersion.skill_md.split("\n").slice(0, 20).join("\n")}
                {confirmVersion.skill_md.split("\n").length > 20 && "\n..."}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmVersion(null)}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRollback}
              disabled={rolling}
              className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {rolling && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Rollback
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
