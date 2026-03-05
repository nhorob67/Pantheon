"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboardingLocation, useOnboardingOperation, useOnboardingActions } from "@/hooks/use-onboarding";
import {
  locationSchema,
  type LocationData,
} from "@/lib/validators/onboarding";
import { TIMEZONES } from "@/types/farm";
import { geocodeLocation, isZipOrPostalCode } from "@/lib/utils/geocode";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { WeatherPreview } from "./weather-preview";
import {
  MapPin,
  ArrowRight,
  ArrowLeft,
  Locate,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { motion } from "motion/react";

function toDMS(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(1);
  const dir = isLat
    ? decimal >= 0
      ? "N"
      : "S"
    : decimal >= 0
      ? "E"
      : "W";
  return `${d}\u00B0${m}'${s}"${dir}`;
}

interface TownResult {
  name: string;
  state: string;
  lat: number;
  lng: number;
  population: number;
}

export function Step2Location() {
  const location = useOnboardingLocation();
  const operation = useOnboardingOperation();
  const { setLocation, setCurrentStep } = useOnboardingActions();
  const [locating, setLocating] = useState(false);
  const [geocoded, setGeocoded] = useState(
    !!(location.weather_lat && location.weather_lng)
  );
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LocationData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      weather_location: location.weather_location ?? "",
      weather_lat: location.weather_lat ?? 0,
      weather_lng: location.weather_lng ?? 0,
      timezone: location.timezone ?? TIMEZONES[operation.state ?? ""] ?? "",
    },
  });

  const lat = useWatch({ control, name: "weather_lat" });
  const lng = useWatch({ control, name: "weather_lng" });
  const weatherLocation = useWatch({ control, name: "weather_location" });

  const fetchSuggestions = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      if (isZipOrPostalCode(query)) return [];

      try {
        const params = new URLSearchParams({
          q: query,
          country: operation.country ?? "US",
        });
        if (operation.state) params.set("state", operation.state);

        const res = await fetch(`/api/towns/search?${params}`);
        const data = await res.json();

        if (data.fallback === "nominatim") return [];

        return (data.results ?? []).map((t: TownResult) => ({
          label: `${t.name}, ${t.state}`,
          value: `${t.name}|${t.state}|${t.lat}|${t.lng}`,
          description:
            t.population > 0
              ? `pop. ${t.population.toLocaleString()}`
              : undefined,
        }));
      } catch {
        return [];
      }
    },
    [operation.country, operation.state]
  );

  const handleTownSelect = (option: ComboboxOption) => {
    const [name, state, latStr, lngStr] = option.value.split("|");
    setValue("weather_location", `${name}, ${state}`, { shouldValidate: true });
    setValue("weather_lat", parseFloat(latStr), { shouldValidate: true });
    setValue("weather_lng", parseFloat(lngStr), { shouldValidate: true });
    setGeocoded(true);
    setGeocodeError(null);
  };

  const handleLocationChange = (value: string) => {
    setValue("weather_location", value, { shouldValidate: true });
    if (geocoded) {
      setGeocoded(false);
      setValue("weather_lat", 0);
      setValue("weather_lng", 0);
    }
    setGeocodeError(null);
  };

  const handleGeocode = async () => {
    const query = weatherLocation;
    if (!query) return;

    setLocating(true);
    setGeocodeError(null);
    setGeocoded(false);

    const result = await geocodeLocation(
      query,
      operation.country ?? "US"
    );

    if (result) {
      setValue("weather_lat", result.lat, { shouldValidate: true });
      setValue("weather_lng", result.lng, { shouldValidate: true });
      setGeocoded(true);
    } else {
      setGeocodeError("Location not found. Try a nearby town or zip code.");
    }

    setLocating(false);
  };

  const onSubmit = (data: LocationData) => {
    setLocation(data);
    setCurrentStep(2);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-5 h-5 text-[var(--green-bright)]" />
          <h2 className="font-headline text-2xl font-bold text-[var(--text-primary)]">
            Dial In Your Weather
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Pinpoint your location for hyper-local weather intelligence.
        </p>
      </motion.div>

      {/* Location input + Locate button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          Nearest Town or Zip / Postal Code
        </label>
        <div className="flex gap-2">
          <Combobox
            value={weatherLocation}
            onChange={handleLocationChange}
            onSelect={handleTownSelect}
            fetchSuggestions={fetchSuggestions}
            placeholder={
              operation.country === "CA"
                ? "e.g. Saskatoon, SK or S7K 1J5"
                : "e.g. Fargo, ND or 58102"
            }
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--green-bright)] focus:ring-2 focus:ring-[var(--green-dim)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none transition-all"
          />
          <button
            type="button"
            onClick={handleGeocode}
            disabled={locating}
            className="px-5 py-3 rounded-xl font-semibold text-sm bg-[var(--green-dim)] text-[var(--green-bright)] border border-[rgba(90,138,60,0.3)] hover:bg-[rgba(90,138,60,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Locate className="w-4 h-4" />
            )}
            Locate
          </button>
        </div>
        {errors.weather_location && (
          <p className="text-red-400 text-xs mt-1">
            {errors.weather_location.message}
          </p>
        )}
        {errors.weather_lat && (
          <p className="text-red-400 text-xs mt-1">
            {errors.weather_lat.message}
          </p>
        )}
        {geocodeError && (
          <p className="text-red-400 text-xs mt-1">{geocodeError}</p>
        )}
      </motion.div>

      {/* Coordinate confirmation */}
      {geocoded && lat !== 0 && lng !== 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--green-dim)] border border-[rgba(90,138,60,0.2)]"
        >
          <CheckCircle2 className="w-5 h-5 text-[var(--green-bright)] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Location confirmed
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {toDMS(lat, true)} &middot; {toDMS(lng, false)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Timezone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          Timezone
        </label>
        <input
          value={useWatch({ control, name: "timezone" })}
          onChange={(e) => setValue("timezone", e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--green-bright)] focus:ring-2 focus:ring-[var(--green-dim)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none transition-all"
        />
        {errors.timezone && (
          <p className="text-red-400 text-xs mt-1">
            {errors.timezone.message}
          </p>
        )}
      </motion.div>

      {/* Weather Preview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green-bright)] mb-3">
          What you&apos;ll get
        </p>
        <WeatherPreview />
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3 pt-2"
      >
        <button
          type="button"
          onClick={() => setCurrentStep(0)}
          className="px-6 py-3.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:border-[var(--border-light)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="flex-1 bg-gradient-to-r from-[var(--green-bright)] to-[#6da04a] text-white font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all hover:shadow-[0_4px_20px_rgba(90,138,60,0.3)] hover:-translate-y-0.5 active:translate-y-0"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </form>
  );
}
