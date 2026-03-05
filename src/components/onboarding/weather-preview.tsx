"use client";

import { Cloud, Droplets, Thermometer } from "lucide-react";

const FEATURES = [
  {
    icon: Cloud,
    title: "7-Day Forecast",
    desc: "NWS-powered forecasts with field-level accuracy for your exact coordinates.",
  },
  {
    icon: Droplets,
    title: "Spray Windows",
    desc: "Real-time wind, humidity, and inversion risk analysis for application decisions.",
  },
  {
    icon: Thermometer,
    title: "GDD Tracking",
    desc: "Growing degree day accumulation with crop-specific base temperatures.",
  },
];

export function WeatherPreview() {
  return (
    <div className="space-y-3">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className="flex items-start gap-4 p-4 rounded-xl bg-[var(--green-dim)] border-l-2 border-[var(--green-bright)]"
        >
          <f.icon className="w-5 h-5 text-[var(--green-bright)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {f.title}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              {f.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
