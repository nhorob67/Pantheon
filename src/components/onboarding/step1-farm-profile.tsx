"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboarding } from "@/hooks/use-onboarding";
import { step1Schema, type Step1Data } from "@/lib/validators/onboarding";
import { SUPPORTED_STATES, CROPS } from "@/types/farm";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import { ONBOARDING_TEMPLATES } from "@/lib/templates/onboarding-templates";

const COUNTIES_BY_STATE: Record<string, string[]> = {
  ND: ["Cass", "Burleigh", "Grand Forks", "Ward", "Williams", "Stark", "Morton", "Richland", "Stutsman", "Barnes"],
  SD: ["Minnehaha", "Pennington", "Lincoln", "Brown", "Brookings", "Codington", "Davison", "Hughes", "Beadle", "Clay"],
  MN: ["Hennepin", "Ramsey", "Dakota", "Anoka", "Washington", "Stearns", "St. Louis", "Olmsted", "Blue Earth", "Clay"],
  MT: ["Yellowstone", "Missoula", "Gallatin", "Flathead", "Cascade", "Lewis and Clark", "Ravalli", "Hill", "Chouteau", "Valley"],
  IA: ["Polk", "Linn", "Scott", "Black Hawk", "Johnson", "Story", "Woodbury", "Dubuque", "Pottawattamie", "Dallas"],
  NE: ["Douglas", "Lancaster", "Sarpy", "Hall", "Buffalo", "Dodge", "Lincoln", "Scotts Bluff", "Madison", "Platte"],
};

export function Step1FarmProfile() {
  const { step1, setStep1, setCurrentStep, selectedTemplateId } = useOnboarding();
  const templateName = selectedTemplateId
    ? ONBOARDING_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name
    : null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      farm_name: step1.farm_name || "",
      state: step1.state || undefined,
      county: step1.county || "",
      primary_crops: step1.primary_crops || [],
      acres: step1.acres || undefined,
    },
  });

  const selectedState = useWatch({ control, name: "state" });
  const selectedCrops = useWatch({ control, name: "primary_crops" }) || [];
  const counties = selectedState ? COUNTIES_BY_STATE[selectedState] || [] : [];

  const onSubmit = (data: Step1Data) => {
    setStep1(data);
    setCurrentStep(2);
  };

  const toggleCrop = (crop: string) => {
    const current = selectedCrops as string[];
    const next = current.includes(crop)
      ? current.filter((c) => c !== crop)
      : [...current, crop];
    setValue("primary_crops", next as Step1Data["primary_crops"], { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="font-headline text-xl font-semibold mb-1">
          Farm Profile
        </h2>
        <p className="text-foreground/60 text-sm">
          Tell us about your operation.
        </p>
      </div>

      {templateName && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-foreground/60">
            Pre-filled from <span className="font-medium">{templateName}</span>. Edit any field to customize.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          Farm Name
        </label>
        <input
          {...register("farm_name")}
          placeholder="e.g. Johnson Family Farm"
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
        />
        {errors.farm_name && (
          <p className="text-destructive text-sm mt-1">{errors.farm_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">
            State
          </label>
          <select
            {...register("state")}
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
          >
            <option value="">Select state</option>
            {SUPPORTED_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="text-destructive text-sm mt-1">{errors.state.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">
            County
          </label>
          <select
            {...register("county")}
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
          >
            <option value="">Select county</option>
            {counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.county && (
            <p className="text-destructive text-sm mt-1">{errors.county.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm text-foreground/70 mb-2">
          Primary Crops
        </label>
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
        {errors.primary_crops && (
          <p className="text-destructive text-sm mt-1">{errors.primary_crops.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          Total Acres
        </label>
        <input
          type="number"
          {...register("acres")}
          placeholder="e.g. 2500"
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
        />
        {errors.acres && (
          <p className="text-destructive text-sm mt-1">{errors.acres.message}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(0)}
          className="border border-border hover:bg-muted text-foreground rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          Next: Grain Marketing
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
