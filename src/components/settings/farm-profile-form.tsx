"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { farmProfileSchema, type FarmProfileFormData } from "@/lib/validators/farm-profile";
import { US_STATES, CA_PROVINCES, CROPS } from "@/types/farm";
import type { FarmProfile } from "@/types/database";
import { useAsyncFormState } from "@/hooks/use-async-form-state";
import { useToast } from "@/components/ui/toast";
import { Loader2, Save } from "lucide-react";

interface FarmProfileFormProps {
  profile: FarmProfile;
  tenantId: string;
}

export function FarmProfileForm({ profile, tenantId }: FarmProfileFormProps) {
  const { saving, error, run } = useAsyncFormState();
  const { toast } = useToast();

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
      soil_ph: profile.soil_ph ?? undefined,
      soil_cec: profile.soil_cec ?? undefined,
      organic_matter_pct: profile.organic_matter_pct ?? undefined,
      avg_annual_rainfall_in: profile.avg_annual_rainfall_in ?? undefined,
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

  const onSubmit = (data: FarmProfileFormData) => {
    run(async () => {
      const res = await fetch(`/api/tenants/${tenantId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes. Please try again.");
      }
      toast("Farm profile saved", "success");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          Farm Name
        </label>
        <input
          {...register("farm_name")}
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
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
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
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
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
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
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
        />
      </div>

      {/* Soil Characteristics */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          Soil Characteristics
        </label>
        <p className="text-xs text-foreground/50 mb-3">
          These values help your Agronomy Advisor give more specific recommendations. Leave blank if unknown.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-foreground/60 mb-1">Soil pH (0–14)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="14"
              {...register("soil_ph", { valueAsNumber: true })}
              placeholder="e.g., 7.2"
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
            />
            {errors.soil_ph && (
              <p className="text-destructive text-xs mt-1">{errors.soil_ph.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-foreground/60 mb-1">CEC (meq/100g)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              {...register("soil_cec", { valueAsNumber: true })}
              placeholder="e.g., 18.5"
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
            />
            {errors.soil_cec && (
              <p className="text-destructive text-xs mt-1">{errors.soil_cec.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-foreground/60 mb-1">Organic Matter %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register("organic_matter_pct", { valueAsNumber: true })}
              placeholder="e.g., 3.8"
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
            />
            {errors.organic_matter_pct && (
              <p className="text-destructive text-xs mt-1">{errors.organic_matter_pct.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-foreground/60 mb-1">Avg Annual Rainfall (in)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              {...register("avg_annual_rainfall_in", { valueAsNumber: true })}
              placeholder="e.g., 22"
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-3 outline-none transition-colors"
            />
            {errors.avg_annual_rainfall_in && (
              <p className="text-destructive text-xs mt-1">{errors.avg_annual_rainfall_in.message}</p>
            )}
          </div>
        </div>
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
        {error && (
          <span className="text-destructive text-sm font-medium">{error}</span>
        )}
      </div>
    </form>
  );
}
