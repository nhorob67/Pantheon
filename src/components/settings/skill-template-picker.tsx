"use client";

import { useState } from "react";
import type { SkillTemplate, SkillTemplateCategory } from "@/types/custom-skill";
import {
  Search, Calculator, BarChart3, Wrench, Beef, FileText, NotebookPen, Bell,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Search: <Search className="w-5 h-5" />,
  Calculator: <Calculator className="w-5 h-5" />,
  BarChart3: <BarChart3 className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
  Beef: <Beef className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  NotebookPen: <NotebookPen className="w-5 h-5" />,
  Bell: <Bell className="w-5 h-5" />,
};

const CATEGORIES: { id: SkillTemplateCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "crop-management", label: "Crop Management" },
  { id: "financial", label: "Financial" },
  { id: "equipment", label: "Equipment" },
  { id: "livestock", label: "Livestock" },
  { id: "compliance", label: "Compliance" },
];

interface SkillTemplatePickerProps {
  templates: SkillTemplate[];
  onSelect: (template: SkillTemplate) => void;
  selectedId?: string;
}

export function SkillTemplatePicker({ templates, onSelect, selectedId }: SkillTemplatePickerProps) {
  const [category, setCategory] = useState<SkillTemplateCategory | "all">("all");

  const filtered = category === "all"
    ? templates
    : templates.filter((t) => t.category === category);

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              category === cat.id
                ? "bg-accent text-bg-deep"
                : "bg-white/5 text-text-secondary hover:bg-white/10"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-accent ring-2 ring-accent/30 bg-accent-dim"
                  : "border-border hover:border-border-light hover:bg-white/[0.02]"
              }`}
            >
              <span className={`shrink-0 mt-0.5 ${isSelected ? "text-accent" : "text-text-dim"}`}>
                {iconMap[template.icon] || <Search className="w-5 h-5" />}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isSelected ? "text-text-primary" : "text-text-secondary"}`}>
                  {template.name}
                </p>
                <p className="text-xs text-text-dim mt-0.5 leading-relaxed">
                  {template.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
