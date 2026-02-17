"use client";

import { useState } from "react";
import {
  Puzzle, Search, Calculator, BarChart3, Wrench, Beef, FileText,
  NotebookPen, Bell, Wheat, CloudSun, ClipboardList, Tractor,
  Sprout, DollarSign, MapPin, Thermometer, Droplets, Bug,
  Sun, Leaf, Ruler, Scale, Truck, Warehouse,
} from "lucide-react";

const ICONS: { name: string; component: React.ReactNode }[] = [
  { name: "Puzzle", component: <Puzzle className="w-5 h-5" /> },
  { name: "Wheat", component: <Wheat className="w-5 h-5" /> },
  { name: "Sprout", component: <Sprout className="w-5 h-5" /> },
  { name: "Leaf", component: <Leaf className="w-5 h-5" /> },
  { name: "Tractor", component: <Tractor className="w-5 h-5" /> },
  { name: "Wrench", component: <Wrench className="w-5 h-5" /> },
  { name: "CloudSun", component: <CloudSun className="w-5 h-5" /> },
  { name: "Thermometer", component: <Thermometer className="w-5 h-5" /> },
  { name: "Droplets", component: <Droplets className="w-5 h-5" /> },
  { name: "Sun", component: <Sun className="w-5 h-5" /> },
  { name: "BarChart3", component: <BarChart3 className="w-5 h-5" /> },
  { name: "Calculator", component: <Calculator className="w-5 h-5" /> },
  { name: "DollarSign", component: <DollarSign className="w-5 h-5" /> },
  { name: "Scale", component: <Scale className="w-5 h-5" /> },
  { name: "ClipboardList", component: <ClipboardList className="w-5 h-5" /> },
  { name: "FileText", component: <FileText className="w-5 h-5" /> },
  { name: "NotebookPen", component: <NotebookPen className="w-5 h-5" /> },
  { name: "Bell", component: <Bell className="w-5 h-5" /> },
  { name: "Search", component: <Search className="w-5 h-5" /> },
  { name: "Bug", component: <Bug className="w-5 h-5" /> },
  { name: "Beef", component: <Beef className="w-5 h-5" /> },
  { name: "MapPin", component: <MapPin className="w-5 h-5" /> },
  { name: "Ruler", component: <Ruler className="w-5 h-5" /> },
  { name: "Truck", component: <Truck className="w-5 h-5" /> },
  { name: "Warehouse", component: <Warehouse className="w-5 h-5" /> },
];

interface SkillIconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function SkillIconPicker({ value, onChange }: SkillIconPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedIcon = ICONS.find((i) => i.name === value) || ICONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-border hover:border-border-light px-3 py-2 transition-colors cursor-pointer"
      >
        <span className="text-accent">{selectedIcon.component}</span>
        <span className="text-xs text-text-dim">{value}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-bg-card border border-border rounded-xl shadow-xl p-3">
            <p className="text-xs text-text-dim mb-2">Choose an icon</p>
            <div className="grid grid-cols-5 gap-1">
              {ICONS.map((icon) => (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => {
                    onChange(icon.name);
                    setOpen(false);
                  }}
                  className={`inline-flex items-center justify-center rounded-lg p-2.5 transition-colors cursor-pointer ${
                    value === icon.name
                      ? "bg-accent/20 text-accent"
                      : "text-text-dim hover:bg-white/5 hover:text-text-primary"
                  }`}
                  title={icon.name}
                >
                  {icon.component}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Get the icon component by name for rendering outside the picker */
export function getSkillIcon(name: string): React.ReactNode {
  return ICONS.find((i) => i.name === name)?.component || <Puzzle className="w-5 h-5" />;
}
