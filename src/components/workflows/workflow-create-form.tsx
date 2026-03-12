"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { WorkflowPlaybook, WorkflowTemplate } from "@/types/workflow";

interface WorkflowCreateFormProps {
  tenantId: string;
  templates: WorkflowTemplate[];
  playbooks: WorkflowPlaybook[];
  initialSourceType?: "template" | "playbook";
  initialPlaybookId?: string;
}

function resolveTemplateBadge(template: WorkflowTemplate): string {
  if (template.template_kind === "starter") {
    return "Starter";
  }

  return "Custom";
}

function resolveTemplateCategory(template: WorkflowTemplate): string | null {
  const category = template.metadata.category;
  if (typeof category !== "string" || category.trim().length === 0) {
    return null;
  }

  return category.trim();
}

export function WorkflowCreateForm({
  tenantId,
  templates,
  playbooks,
  initialSourceType,
  initialPlaybookId,
}: WorkflowCreateFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<"template" | "playbook">(
    initialSourceType === "playbook" && playbooks.length > 0
      ? "playbook"
      : initialSourceType === "template"
        ? "template"
        : playbooks.length > 0
          ? "playbook"
          : "template"
  );
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id || "");
  const [playbookId, setPlaybookId] = useState<string>(
    initialPlaybookId && playbooks.some((playbook) => playbook.id === initialPlaybookId)
      ? initialPlaybookId
      : playbooks[0]?.id || ""
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === templateId) || templates[0] || null,
    [templateId, templates]
  );
  const selectedPlaybook = useMemo(
    () =>
      playbooks.find((playbook) => playbook.id === playbookId) ||
      playbooks[0] ||
      null,
    [playbookId, playbooks]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Workflow name is required.");
      return;
    }

    if (sourceType === "template" && !selectedTemplate) {
      setError("Select a workflow template.");
      return;
    }

    if (sourceType === "playbook" && !selectedPlaybook) {
      setError("Select a workflow playbook.");
      return;
    }

    setIsCreating(true);
    try {
      const response =
        sourceType === "template"
          ? await fetch(
              `/api/tenants/${tenantId}/workflow-templates/${encodeURIComponent(
                selectedTemplate!.id
              )}/use`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: trimmedName,
                  description:
                    description.trim().length > 0 ? description.trim() : null,
                }),
              }
            )
          : await fetch(
              `/api/tenants/${tenantId}/workflow-playbooks/${encodeURIComponent(
                selectedPlaybook!.id
              )}/install`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: trimmedName,
                  description:
                    description.trim().length > 0 ? description.trim() : null,
                }),
              }
            );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to create workflow."
        );
        setIsCreating(false);
        return;
      }

      const workflow = payload.workflow as { id?: unknown } | undefined;
      if (!workflow || typeof workflow.id !== "string") {
        setError("Workflow created, but response payload was missing workflow ID.");
        setIsCreating(false);
        return;
      }

      router.push(`/settings/workflows/${workflow.id}`);
    } catch {
      setError("Failed to create workflow.");
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/workflows"
          className="inline-flex items-center gap-1 text-xs text-text-dim transition-colors hover:text-text-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to workflows
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-bg-card/80 p-5">
        <h3 className="font-headline text-lg font-semibold text-text-primary">
          Create Workflow
        </h3>
        <p className="mt-1 text-sm text-text-dim">
          Start from a guided template or a reusable marketplace playbook.
        </p>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="workflow-name" className="text-xs font-medium text-text-secondary">
              Workflow name
            </label>
            <input
              id="workflow-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-border-light"
              placeholder="Order follow-up automation"
            />
          </div>

          <div className="space-y-2">
            <Textarea
              id="workflow-description"
              label="Description (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full bg-bg-dark text-sm text-text-secondary"
              placeholder="Describe what this workflow should do."
            />
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-text-secondary">Source</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSourceType("template")}
                className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                  sourceType === "template"
                    ? "border-accent/60 bg-accent/10 text-text-primary"
                    : "border-border text-text-dim hover:border-border-light hover:text-text-primary"
                }`}
              >
                Templates
              </button>
              <button
                type="button"
                onClick={() => setSourceType("playbook")}
                className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                  sourceType === "playbook"
                    ? "border-accent/60 bg-accent/10 text-text-primary"
                    : "border-border text-text-dim hover:border-border-light hover:text-text-primary"
                }`}
              >
                Marketplace Playbooks
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-medium text-text-secondary">
              {sourceType === "template" ? "Template" : "Playbook"}
            </legend>
            {sourceType === "template" ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {templates.map((template) => {
                  const selected = template.id === templateId;
                  const category = resolveTemplateCategory(template);
                  return (
                    <label
                      key={template.id}
                      className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                        selected
                          ? "border-accent/60 bg-accent/10"
                          : "border-border bg-bg-dark/30 hover:border-border-light"
                      }`}
                    >
                      <input
                        type="radio"
                        name="workflow-template"
                        value={template.id}
                        checked={selected}
                        onChange={() => setTemplateId(template.id)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary">{template.name}</p>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-dim">
                          {resolveTemplateBadge(template)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-dim">
                        {template.description || "No description provided."}
                      </p>
                      {category && (
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-300/90">
                          {category}
                        </p>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : playbooks.length === 0 ? (
              <p className="mt-2 rounded-xl border border-border bg-bg-dark/20 px-3 py-2 text-xs text-text-dim">
                No playbooks published yet. Publish one from the builder to reuse it
                here.
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {playbooks.map((playbook) => {
                  const selected = playbook.id === playbookId;
                  return (
                    <label
                      key={playbook.id}
                      className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                        selected
                          ? "border-accent/60 bg-accent/10"
                          : "border-border bg-bg-dark/30 hover:border-border-light"
                      }`}
                    >
                      <input
                        type="radio"
                        name="workflow-playbook"
                        value={playbook.id}
                        checked={selected}
                        onChange={() => setPlaybookId(playbook.id)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary">{playbook.name}</p>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-dim">
                          v{playbook.latest_version}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-dim">
                        {playbook.summary || playbook.description || "No summary provided."}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-300/90">
                        {playbook.category || "general"} • {playbook.install_count} installs
                      </p>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={
                isCreating ||
                (sourceType === "template" && !selectedTemplate) ||
                (sourceType === "playbook" && !selectedPlaybook)
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-deep transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating draft...
                </>
              ) : (
                "Create workflow"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
