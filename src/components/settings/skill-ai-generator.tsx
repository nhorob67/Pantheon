"use client";

import { useState, useRef } from "react";
import type { SkillTemplate } from "@/types/custom-skill";
import { SkillTemplatePicker } from "./skill-template-picker";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";

interface SkillAiGeneratorProps {
  templates: SkillTemplate[];
  onGenerated: (skillMd: string) => void;
}

export function SkillAiGenerator({ templates, onGenerated }: SkillAiGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<SkillTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) return;

    setGenerating(true);
    setStreamedText("");
    setError(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/custom-skills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          template_id: selectedTemplate?.id,
          farm_context: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Generation failed");
        setGenerating(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const json = JSON.parse(data);
            if (json.content) {
              accumulated += json.content;
              setStreamedText(accumulated);
            }
          } catch {
            // skip
          }
        }
      }

      if (accumulated) {
        onGenerated(accumulated);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      {/* Prompt textarea */}
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">
          Describe what you want your skill to do
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g., I want a skill that helps me track field tile drainage projects, including locations, costs, contractor info, and drainage patterns..."
          className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim resize-y"
          disabled={generating}
        />
        <p className="text-xs text-text-dim mt-1">
          {prompt.length}/5000 characters (min 10)
        </p>
      </div>

      {/* Template selector */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
          {selectedTemplate ? `Template: ${selectedTemplate.name}` : "Start from a template (optional)"}
        </button>

        {showTemplates && (
          <div className="mt-3">
            <SkillTemplatePicker
              templates={templates}
              onSelect={(t) => {
                setSelectedTemplate(t.id === selectedTemplate?.id ? null : t);
              }}
              selectedId={selectedTemplate?.id}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Streaming output */}
      {streamedText && (
        <div className="rounded-lg border border-border bg-bg-deep p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
            {streamedText}
            {generating && <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {generating ? (
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={prompt.length < 10}
            className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer forge-glow"
          >
            <Sparkles className="w-4 h-4" />
            Forge Skill
          </button>
        )}

        {generating && (
          <span className="flex items-center gap-2 text-sm text-accent">
            <Loader2 className="w-4 h-4 animate-spin" />
            Forging...
          </span>
        )}
      </div>
    </div>
  );
}
