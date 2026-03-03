"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

const ALL_FIELDS = [
  { key: "date", label: "Date" },
  { key: "elevator", label: "Elevator" },
  { key: "crop", label: "Crop" },
  { key: "gross_weight", label: "Gross Weight" },
  { key: "tare_weight", label: "Tare Weight" },
  { key: "net_weight", label: "Net Weight" },
  { key: "moisture_pct", label: "Moisture %" },
  { key: "test_weight", label: "Test Weight" },
  { key: "dockage_pct", label: "Dockage %" },
  { key: "price_per_bushel", label: "Price/Bushel" },
  { key: "grade", label: "Grade" },
  { key: "truck_number", label: "Truck #" },
  { key: "load_number", label: "Load #" },
  { key: "field_name", label: "Field Name" },
  { key: "notes", label: "Notes" },
] as const;

interface ScaleTicketFieldsConfigProps {
  tenantId: string;
  initialVisibleFields: string[];
  initialRequiredFields: string[];
}

export function ScaleTicketFieldsConfig({
  tenantId,
  initialVisibleFields,
  initialRequiredFields,
}: ScaleTicketFieldsConfigProps) {
  const [visibleFields, setVisibleFields] = useState<string[]>(initialVisibleFields);
  const [requiredFields, setRequiredFields] = useState<string[]>(initialRequiredFields);
  const [saving, setSaving] = useState(false);

  const toggleVisible = (field: string) => {
    if (visibleFields.includes(field)) {
      setVisibleFields(visibleFields.filter((f) => f !== field));
      setRequiredFields(requiredFields.filter((f) => f !== field));
    } else {
      setVisibleFields([...visibleFields, field]);
    }
  };

  const toggleRequired = (field: string) => {
    if (requiredFields.includes(field)) {
      setRequiredFields(requiredFields.filter((f) => f !== field));
    } else {
      setRequiredFields([...requiredFields, field]);
      if (!visibleFields.includes(field)) {
        setVisibleFields([...visibleFields, field]);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tenants/${tenantId}/update-skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: "farm-scale-tickets",
          enabled: true,
          config: {
            visible_fields: visibleFields,
            required_fields: requiredFields,
          },
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 bg-muted/50 rounded-lg p-4 space-y-3">
      <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
        Field Configuration
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_FIELDS.map((field) => {
          const isVisible = visibleFields.includes(field.key);
          const isRequired = requiredFields.includes(field.key);
          return (
            <div
              key={field.key}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleVisible(field.key)}
                  className="rounded border-border text-primary focus:ring-primary/20"
                />
                <span className={`text-sm ${isVisible ? "text-foreground" : "text-foreground/40"}`}>
                  {field.label}
                </span>
              </div>
              {isVisible && (
                <button
                  type="button"
                  onClick={() => toggleRequired(field.key)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                    isRequired
                      ? "bg-primary/20 text-primary font-medium"
                      : "bg-transparent text-foreground/30 hover:text-foreground/50"
                  }`}
                >
                  {isRequired ? "required" : "optional"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Fields
        </button>
      </div>
    </div>
  );
}
