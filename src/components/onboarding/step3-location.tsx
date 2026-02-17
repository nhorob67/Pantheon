"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboarding } from "@/hooks/use-onboarding";
import { step3Schema, type Step3Data } from "@/lib/validators/onboarding";
import { TIMEZONES, type SupportedState } from "@/types/farm";
import { geocodeLocation } from "@/lib/utils/geocode";
import { ArrowLeft, ArrowRight, MapPin, Loader2 } from "lucide-react";

export function Step3Location() {
  const { step1, step3, setStep3, setCurrentStep } = useOnboarding();
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState(!!step3.weather_lat);

  const defaultTz = TIMEZONES[step1.state as SupportedState] || "America/Chicago";

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      weather_location: step3.weather_location || "",
      weather_lat: step3.weather_lat || undefined,
      weather_lng: step3.weather_lng || undefined,
      timezone: step3.timezone || defaultTz,
    },
  });

  const location = useWatch({ control, name: "weather_location" });
  const lat = useWatch({ control, name: "weather_lat" });
  const lng = useWatch({ control, name: "weather_lng" });

  const handleGeocode = async () => {
    if (!location) return;
    setGeocoding(true);

    const result = await geocodeLocation(`${location}, ${step1.state}`);
    if (result) {
      setValue("weather_lat", result.lat);
      setValue("weather_lng", result.lng);
      setGeocoded(true);
    }
    setGeocoding(false);
  };

  const onSubmit = (data: Step3Data) => {
    setStep3(data);
    setCurrentStep(4);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="font-headline text-xl font-semibold mb-1">
          Location & Weather
        </h2>
        <p className="text-foreground/60 text-sm">
          We&apos;ll use this for your daily weather briefing and spray window
          analysis.
        </p>
      </div>

      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          Nearest Town or Zip Code
        </label>
        <div className="flex gap-2">
          <input
            {...register("weather_location")}
            placeholder="e.g. Fargo or 58102"
            className="flex-1 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={handleGeocode}
            disabled={geocoding || !location}
            className="border border-border hover:bg-muted text-foreground rounded-lg px-4 py-3 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {geocoding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            Locate
          </button>
        </div>
        {errors.weather_location && (
          <p className="text-destructive text-sm mt-1">
            {errors.weather_location.message}
          </p>
        )}
      </div>

      {geocoded && lat !== 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Location confirmed
            </span>
          </div>
          <p className="text-sm text-foreground/60 font-mono">
            {lat.toFixed(4)}°N, {Math.abs(lng).toFixed(4)}°W
          </p>
        </div>
      )}

      <input type="hidden" {...register("weather_lat", { valueAsNumber: true })} />
      <input type="hidden" {...register("weather_lng", { valueAsNumber: true })} />
      {errors.weather_lat && (
        <p className="text-destructive text-sm">
          {errors.weather_lat.message || "Use the Locate button to set coordinates"}
        </p>
      )}

      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          Timezone
        </label>
        <select
          {...register("timezone")}
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
        >
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
        </select>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="border border-border hover:bg-muted text-foreground rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          Next: Connect Channel
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
