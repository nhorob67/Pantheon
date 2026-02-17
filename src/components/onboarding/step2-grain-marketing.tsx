"use client";

import { useState } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { ELEVATOR_PRESETS, type SupportedState } from "@/types/farm";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";

interface ElevatorEntry {
  name: string;
  url: string;
  crops: string[];
}

export function Step2GrainMarketing() {
  const { step1, step2, setStep2, setCurrentStep } = useOnboarding();
  const [elevators, setElevators] = useState<ElevatorEntry[]>(
    step2.elevators || []
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const presets = ELEVATOR_PRESETS.filter((p) =>
    p.states.includes(step1.state as SupportedState)
  );

  const crops = step1.primary_crops || [];

  const addPreset = (preset: { name: string; url: string }) => {
    if (elevators.find((e) => e.name === preset.name)) return;
    setElevators([
      ...elevators,
      { name: preset.name, url: preset.url, crops: crops as string[] },
    ]);
  };

  const addCustom = () => {
    if (!newName || !newUrl) return;
    setElevators([
      ...elevators,
      { name: newName, url: newUrl, crops: crops as string[] },
    ]);
    setNewName("");
    setNewUrl("");
    setShowAdd(false);
  };

  const removeElevator = (index: number) => {
    setElevators(elevators.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (elevators.length === 0) {
      setError("Add at least one elevator");
      return;
    }
    setStep2({ elevators });
    setCurrentStep(3);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-xl font-semibold mb-1">
          Grain Marketing
        </h2>
        <p className="text-foreground/60 text-sm">
          Which elevators do you sell to? We&apos;ll check their cash bids daily.
        </p>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div>
          <label className="block text-sm text-foreground/70 mb-2">
            Common elevators in {step1.state}
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const added = elevators.find((e) => e.name === preset.name);
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => addPreset(preset)}
                  disabled={!!added}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    added
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-foreground/60 hover:border-foreground/30"
                  }`}
                >
                  {added ? "✓ " : "+ "}
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Current elevators */}
      {elevators.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm text-foreground/70">
            Your elevators
          </label>
          {elevators.map((elevator, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-muted rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{elevator.name}</p>
                <p className="text-xs text-foreground/50 truncate max-w-xs">
                  {elevator.url}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeElevator(i)}
                className="text-foreground/40 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom */}
      {showAdd ? (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Elevator name"
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-2.5 text-sm outline-none"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Cash bid page URL (e.g. https://...)"
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-2.5 text-sm outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addCustom}
              className="bg-energy hover:bg-amber-600 text-white text-sm font-medium rounded-full px-4 py-2 transition-colors"
            >
              Add Elevator
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-foreground/50 hover:text-foreground text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm text-energy hover:text-amber-600 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add custom elevator
        </button>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="border border-border hover:bg-muted text-foreground rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          Next: Location & Weather
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
