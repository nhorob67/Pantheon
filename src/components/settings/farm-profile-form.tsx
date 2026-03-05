"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { farmProfileSchema, type FarmProfileFormData } from "@/lib/validators/farm-profile";
import { US_STATES, CA_PROVINCES, CROPS } from "@/types/farm";
import type { FarmProfile } from "@/types/database";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";

interface FarmProfileFormProps {
  profile: FarmProfile;
  tenantId: string;
}

export function FarmProfileForm({ profile, tenantId }: FarmProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FarmProfileFormData>({
    resolver: zodResolver(farmProfileSchema),
    defaultValues: {
      farm_name: profile.farm_name || "",
      state: profile.state || "",
      county: profile.county || "",
      primary_crops: (profile.primary_crops || []) as FarmProfileFormData["primary_crops"],
      acres: profile.acres || undefined,
    },
  });

  const selectedCrops = useWatch({ control, name: "primary_crops" }) || [];

  const toggleCrop = (crop: string) => {
    const current = selectedCrops as string[];
    const next = current.includes(crop)
      ? current.filter((c) => c !== crop)
      : [...current, crop];
    setValue("primary_crops", next as FarmProfileFormData["primary_crops"], {
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: FarmProfileFormData) => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          Farm Name
        </label>
        <input
          {...register("farm_name")}
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
        />
        {errors.farm_name && (
          <p className="text-destructive text-sm mt-1">{errors.farm_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">State</label>
          <select
            {...register("state")}
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
          >
            <optgroup label="United States">
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </optgroup>
            <optgroup label="Canada">
              {CA_PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">County</label>
          <input
            {...register("county")}
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-foreground/70 mb-2">Primary Crops</label>
        <div className="flex flex-wrap gap-2">
          {CROPS.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => toggleCrop(crop)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                (selectedCrops as string[]).includes(crop)
                  ? "bg-primary/10 border-primary text-primary font-medium"
                  : "border-border text-foreground/60 hover:border-foreground/30"
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">Total Acres</label>
        <input
          type="number"
          {...register("acres")}
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
        {saved && (
          <span className="text-primary text-sm font-medium">Saved!</span>
        )}
        {error && (
          <span className="text-destructive text-sm font-medium">{error}</span>
        )}
      </div>
    </form>
  );
}
