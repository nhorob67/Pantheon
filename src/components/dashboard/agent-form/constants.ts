import type { PersonalityPreset } from "@/types/agent";
import { Wheat, TrendingUp, CloudSun, ClipboardList, Tractor, Pen } from "lucide-react";
import { createElement } from "react";

export const presetIcons: Record<string, React.ReactNode> = {
  Wheat: createElement(Wheat, { className: "w-5 h-5" }),
  TrendingUp: createElement(TrendingUp, { className: "w-5 h-5" }),
  CloudSun: createElement(CloudSun, { className: "w-5 h-5" }),
  ClipboardList: createElement(ClipboardList, { className: "w-5 h-5" }),
  Tractor: createElement(Tractor, { className: "w-5 h-5" }),
  Pen: createElement(Pen, { className: "w-5 h-5" }),
};

export const presetRingColor: Record<PersonalityPreset, string> = {
  general: "ring-green-bright",
  grain: "ring-amber-500",
  weather: "ring-blue-400",
  "scale-tickets": "ring-orange-500",
  operations: "ring-emerald-500",
  custom: "ring-text-dim",
};
