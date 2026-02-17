"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboarding } from "@/hooks/use-onboarding";
import { step4Schema, type Step4Data } from "@/lib/validators/onboarding";
import { ArrowLeft, ArrowRight, Hash } from "lucide-react";

export function Step4Channel() {
  const { step4, setStep4, setCurrentStep } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      channel_type: "discord",
      channel_token: step4.channel_token || "",
    },
  });

  const onSubmit = (data: Step4Data) => {
    setStep4(data);
    setCurrentStep(5);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="font-headline text-xl font-semibold mb-1">
          Connect Your Discord Server
        </h2>
        <p className="text-foreground/60 text-sm">
          Your FarmClaw assistant lives in your farm&apos;s Discord server — organized channels, role-based access, and free for your whole team.
        </p>
      </div>

      {/* Discord info card */}
      <div className="bg-[#5865F2]/5 border border-[#5865F2]/20 rounded-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center flex-shrink-0">
          <Hash className="w-5 h-5 text-[#5865F2]" />
        </div>
        <div>
          <p className="font-medium text-sm">Why Discord?</p>
          <p className="text-xs text-foreground/50 mt-1">
            Organized channels for #grain-bids, #weather, and #equipment. Role-based access for your whole team. Free platform with unlimited history.
          </p>
        </div>
      </div>

      {/* Bot token input */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <p className="text-sm text-foreground/60">
          Create a bot in the Discord Developer Portal and paste the token below.
        </p>

        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">
            Bot Token
          </label>
          <input
            {...register("channel_token")}
            type="password"
            placeholder="MTIzNDU2Nzg5..."
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors font-mono text-sm"
          />
          {errors.channel_token && (
            <p className="text-destructive text-sm mt-1">
              {errors.channel_token.message}
            </p>
          )}
        </div>

        <input type="hidden" {...register("channel_type")} value="discord" />
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className="border border-border hover:bg-muted text-foreground rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2"
        >
          Next: Review
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
