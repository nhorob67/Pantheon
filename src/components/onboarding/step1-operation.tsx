"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboarding } from "@/hooks/use-onboarding";
import {
  operationSchema,
  type OperationData,
} from "@/lib/validators/onboarding";
import { US_STATES, CA_PROVINCES, TIMEZONES } from "@/types/farm";
import { BusinessTypePicker } from "./business-type-picker";
import { Building2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function Step1Operation() {
  const { operation, setOperation, setLocation, setCurrentStep } =
    useOnboarding();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<OperationData>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      operation_name: operation.operation_name ?? "",
      business_type: operation.business_type ?? null,
      country: operation.country ?? "US",
      state: operation.state ?? "",
      county: operation.county ?? "",
    },
  });

  const country = useWatch({ control, name: "country" });
  const businessType = useWatch({ control, name: "business_type" });
  const regions = country === "CA" ? CA_PROVINCES : US_STATES;

  const onSubmit = (data: OperationData) => {
    setOperation({
      ...data,
      business_type: data.business_type ?? undefined,
    });
    // Auto-set timezone from state
    const tz = TIMEZONES[data.state];
    if (tz) {
      setLocation({ timezone: tz });
    }
    setCurrentStep(1);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="font-headline text-2xl font-bold text-[var(--text-primary)]">
            Your Operation
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Tell us about your agricultural business.
        </p>
      </motion.div>

      {/* Operation Name */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          Operation Name
        </label>
        <input
          {...register("operation_name")}
          placeholder="e.g. Johnson Family Farm"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none transition-all"
        />
        {errors.operation_name && (
          <p className="text-red-400 text-xs mt-1">
            {errors.operation_name.message}
          </p>
        )}
      </motion.div>

      {/* Business Type */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
          Business Type{" "}
          <span className="text-[var(--text-dim)] font-normal">(optional)</span>
        </label>
        <BusinessTypePicker
          value={businessType}
          onChange={(v) => setValue("business_type", v, { shouldValidate: true })}
        />
      </motion.div>

      {/* Country Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
          Country
        </label>
        <div className="flex gap-3">
          {(["US", "CA"] as const).map((c) => {
            const selected = country === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setValue("country", c, { shouldValidate: true });
                  setValue("state", ""); // reset state when country changes
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                }`}
              >
                <span className="text-lg">{c === "US" ? "🇺🇸" : "🇨🇦"}</span>
                {c === "US" ? "United States" : "Canada"}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* State / Province */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            {country === "CA" ? "Province" : "State"}
          </label>
          <select
            {...register("state")}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none transition-all appearance-none"
          >
            <option value="">
              Select {country === "CA" ? "province" : "state"}...
            </option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="text-red-400 text-xs mt-1">{errors.state.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            County / Region{" "}
            <span className="text-[var(--text-dim)] font-normal">
              (optional)
            </span>
          </label>
          <input
            {...register("county")}
            placeholder="e.g. Cass County"
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none transition-all"
          />
        </div>
      </motion.div>

      {/* Continue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="pt-2"
      >
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-[var(--bg-deep)] font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all hover:shadow-[0_4px_20px_rgba(217,140,46,0.3)] hover:-translate-y-0.5 active:translate-y-0"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </form>
  );
}
