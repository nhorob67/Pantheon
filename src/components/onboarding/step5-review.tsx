"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/use-onboarding";
import { ProvisioningProgress } from "./provisioning-progress";
import { TIMEZONES, type SupportedState } from "@/types/farm";
import {
  ArrowLeft,
  Rocket,
  Wheat,
  MapPin,
  Hash,
  Building,
  LayoutTemplate,
} from "lucide-react";
import { ONBOARDING_TEMPLATES } from "@/lib/templates/onboarding-templates";

export function Step5Review() {
  const router = useRouter();
  const { step1, step2, step3, step4, setCurrentStep, reset, selectedTemplateId } =
    useOnboarding();
  const templateName = selectedTemplateId
    ? ONBOARDING_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name
    : null;
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);

    try {
      // Get customer ID from the API
      const meRes = await fetch("/api/customers/me");

      if (!meRes.ok) {
        throw new Error("Could not load your account. Please try again.");
      }

      const { customer_id } = await meRes.json();

      // Provision instance
      const res = await fetch("/api/instances/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id,
          farm_profile: {
            farm_name: step1.farm_name,
            state: step1.state,
            county: step1.county,
            primary_crops: step1.primary_crops,
            acres: step1.acres,
            elevators: step2.elevators,
            weather_location: step3.weather_location,
            weather_lat: step3.weather_lat,
            weather_lng: step3.weather_lng,
            timezone:
              step3.timezone ||
              TIMEZONES[step1.state as SupportedState] ||
              "America/Chicago",
          },
          channel: {
            type: "discord",
            token: step4.channel_token,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Provisioning failed");
      }

      // Wait for animation, then redirect
      await new Promise((r) => setTimeout(r, 5000));
      reset();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLaunching(false);
    }
  };

  if (launching) {
    return <ProvisioningProgress />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-xl font-semibold mb-1">
          Review & Launch
        </h2>
        <p className="text-foreground/60 text-sm">
          Everything look good? Let&apos;s fire it up.
        </p>
      </div>

      {/* Summary cards */}
      <div className="space-y-3">
        {templateName && (
          <div className="bg-muted rounded-lg p-4 flex items-start gap-3">
            <LayoutTemplate className="w-5 h-5 text-intelligence mt-0.5" />
            <div>
              <p className="font-medium text-sm">Template</p>
              <p className="text-xs text-foreground/50">{templateName}</p>
            </div>
          </div>
        )}

        <div className="bg-muted rounded-lg p-4 flex items-start gap-3">
          <Wheat className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-sm">{step1.farm_name}</p>
            <p className="text-xs text-foreground/50">
              {step1.county} County, {step1.state} &middot; {step1.acres} acres
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              {(step1.primary_crops || []).join(", ")}
            </p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 flex items-start gap-3">
          <Building className="w-5 h-5 text-energy mt-0.5" />
          <div>
            <p className="font-medium text-sm">
              {(step2.elevators || []).length} Elevator
              {(step2.elevators || []).length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-foreground/50">
              {(step2.elevators || []).map((e) => e.name).join(", ")}
            </p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-intelligence mt-0.5" />
          <div>
            <p className="font-medium text-sm">{step3.weather_location}</p>
            <p className="text-xs text-foreground/50 font-mono">
              {step3.weather_lat?.toFixed(4)}°N,{" "}
              {Math.abs(step3.weather_lng || 0).toFixed(4)}°W
            </p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 flex items-start gap-3">
          <Hash className="w-5 h-5 text-[#5865F2] mt-0.5" />
          <div>
            <p className="font-medium text-sm">Discord</p>
            <p className="text-xs text-foreground/50">Connected and ready</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(4)}
          className="border border-border hover:bg-muted text-foreground rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleLaunch}
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          <Rocket className="w-4 h-4" />
          Launch My FarmClaw
        </button>
      </div>
    </div>
  );
}
