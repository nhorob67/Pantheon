import { useCallback, useRef, useState } from "react";
import type { CreateAgentData } from "@/lib/validators/agent";
import type { UseFormReset } from "react-hook-form";

interface UseNlGenerationOptions {
  defaultValues: CreateAgentData;
  reset: UseFormReset<CreateAgentData>;
  setSelectedTemplateId: (id: string) => void;
  setActiveTab: (tab: "identity" | "skills" | "advanced") => void;
}

export function useNlGeneration({
  defaultValues,
  reset,
  setSelectedTemplateId,
  setActiveTab,
}: UseNlGenerationOptions) {
  const [nlDescription, setNlDescription] = useState("");
  const [nlGenerating, setNlGenerating] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  const descriptionRef = useRef(nlDescription);
  descriptionRef.current = nlDescription;
  const defaultValuesRef = useRef(defaultValues);
  defaultValuesRef.current = defaultValues;

  const resetNl = useCallback(() => {
    setNlDescription("");
    setNlGenerating(false);
    setNlError(null);
  }, []);

  const handleNlGenerate = useCallback(async () => {
    const description = descriptionRef.current;
    if (description.length < 10) {
      setNlError("Please describe your agent in at least 10 characters");
      return;
    }
    setNlGenerating(true);
    setNlError(null);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }
      const data = await res.json();
      if (data.agent) {
        reset({
          ...defaultValuesRef.current,
          display_name: data.agent.display_name ?? "",
          role: data.agent.role ?? "",
          goal: data.agent.goal ?? "",
          backstory: data.agent.backstory ?? "",
          autonomy_level: data.agent.autonomy_level ?? "copilot",
        });
        setSelectedTemplateId("scratch");
        setActiveTab("identity");
      }
    } catch (e) {
      setNlError(
        e instanceof Error
          ? e.message
          : "Could not generate agent. Try a template or fill manually."
      );
    }
    setNlGenerating(false);
  }, [reset, setSelectedTemplateId, setActiveTab]);

  return {
    nlDescription,
    setNlDescription,
    nlGenerating,
    nlError,
    resetNl,
    handleNlGenerate,
  };
}
