"use client";

import {
  Tractor,
  Beef,
  Wheat,
  ShieldCheck,
  Users,
  Store,
  Truck,
  MoreHorizontal,
} from "lucide-react";
import type { BusinessType } from "@/types/farm";

const BUSINESS_TYPE_CONFIG: {
  type: BusinessType;
  icon: React.ElementType;
  label: string;
}[] = [
  { type: "Farm", icon: Tractor, label: "Farm" },
  { type: "Ranch", icon: Beef, label: "Ranch" },
  { type: "Seed Dealer", icon: Wheat, label: "Seed Dealer" },
  { type: "Crop Insurance", icon: ShieldCheck, label: "Crop Insurance" },
  { type: "Consultant", icon: Users, label: "Consultant" },
  { type: "Ag Retailer", icon: Store, label: "Ag Retailer" },
  { type: "Custom Applicator", icon: Truck, label: "Custom Applicator" },
  { type: "Other", icon: MoreHorizontal, label: "Other" },
];

interface BusinessTypePickerProps {
  value?: BusinessType | null;
  onChange: (type: BusinessType | null) => void;
}

export function BusinessTypePicker({ value, onChange }: BusinessTypePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {BUSINESS_TYPE_CONFIG.map(({ type, icon: Icon, label }) => {
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(selected ? null : type)}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent-dim)] shadow-[0_0_20px_rgba(217,140,46,0.1)]"
                : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-light)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            <Icon
              className={`w-7 h-7 ${
                selected ? "text-[var(--accent)]" : "text-[var(--text-dim)]"
              }`}
            />
            <span
              className={`text-xs font-medium text-center leading-tight ${
                selected
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
