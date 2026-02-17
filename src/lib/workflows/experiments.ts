import { validateWorkflowGraph } from "../validators/workflow.ts";
import { simulateWorkflowGraph } from "./simulation.ts";
import type { WorkflowGraph } from "../../types/workflow";

export interface WorkflowExperimentVariantInput {
  id: string;
  label?: string;
  branch_decisions: Record<string, boolean>;
}

export interface WorkflowExperimentVariantResult {
  id: string;
  label: string;
  branch_decisions: Record<string, boolean>;
  completed: boolean;
  stop_reason: string;
  step_count: number;
  warning_count: number;
  error_count: number;
  score: number;
}

export interface WorkflowExperimentEvaluationResult {
  ok: boolean;
  validation_errors: ReturnType<typeof validateWorkflowGraph>["errors"];
  variants: WorkflowExperimentVariantResult[];
  winner_variant_id: string | null;
  notes: string[];
}

interface EvaluateWorkflowExperimentInput {
  graph: WorkflowGraph;
  variants?: WorkflowExperimentVariantInput[];
  stopAtApproval?: boolean;
  maxSteps?: number;
}

function normalizeVariantId(value: string, fallbackIndex: number): string {
  const normalized = value.trim();
  if (normalized.length > 0) {
    return normalized;
  }

  return `variant-${fallbackIndex + 1}`;
}

function buildDefaultVariants(graph: WorkflowGraph): WorkflowExperimentVariantInput[] {
  const conditionNodeIds = graph.nodes
    .filter((node) => node.type === "condition")
    .map((node) => node.id)
    .sort((a, b) => a.localeCompare(b));

  if (conditionNodeIds.length === 0) {
    return [
      {
        id: "A",
        label: "Baseline",
        branch_decisions: {},
      },
      {
        id: "B",
        label: "Baseline copy",
        branch_decisions: {},
      },
    ];
  }

  const allTrue: Record<string, boolean> = {};
  const allFalse: Record<string, boolean> = {};
  for (const nodeId of conditionNodeIds) {
    allTrue[nodeId] = true;
    allFalse[nodeId] = false;
  }

  return [
    {
      id: "A",
      label: "Primary branch preference",
      branch_decisions: allTrue,
    },
    {
      id: "B",
      label: "Fallback branch preference",
      branch_decisions: allFalse,
    },
  ];
}

function computeVariantScore(input: {
  completed: boolean;
  stopReason: string;
  stepCount: number;
  warningCount: number;
  errorCount: number;
}): number {
  let score = 0;

  if (input.completed) {
    score += 100;
  }

  if (input.stopReason === "approval_required") {
    score += 40;
  }

  if (input.stopReason === "validation_failed") {
    score -= 200;
  }

  if (input.stopReason === "invalid_condition_branch") {
    score -= 80;
  }

  score -= input.stepCount * 0.6;
  score -= input.warningCount * 6;
  score -= input.errorCount * 12;

  return Math.round(score * 100) / 100;
}

function selectWinner(variants: WorkflowExperimentVariantResult[]): string | null {
  if (variants.length === 0) {
    return null;
  }

  const ranked = variants
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.error_count !== b.error_count) {
        return a.error_count - b.error_count;
      }

      if (a.warning_count !== b.warning_count) {
        return a.warning_count - b.warning_count;
      }

      if (a.step_count !== b.step_count) {
        return a.step_count - b.step_count;
      }

      return a.id.localeCompare(b.id);
    });

  return ranked[0]?.id || null;
}

export function evaluateWorkflowExperiment(
  input: EvaluateWorkflowExperimentInput
): WorkflowExperimentEvaluationResult {
  const validation = validateWorkflowGraph(input.graph);
  if (!validation.valid) {
    return {
      ok: false,
      validation_errors: validation.errors,
      variants: [],
      winner_variant_id: null,
      notes: ["Graph validation failed; experiment evaluation was skipped."],
    };
  }

  const variants =
    input.variants && input.variants.length >= 2
      ? input.variants
      : buildDefaultVariants(input.graph);

  const stopAtApproval = input.stopAtApproval ?? true;
  const maxSteps = Math.max(1, Math.min(500, input.maxSteps ?? 200));

  const normalizedVariants = variants.map((variant, index) => ({
    id: normalizeVariantId(variant.id, index),
    label:
      typeof variant.label === "string" && variant.label.trim().length > 0
        ? variant.label.trim()
        : `Variant ${index + 1}`,
    branch_decisions: variant.branch_decisions || {},
  }));

  const variantResults: WorkflowExperimentVariantResult[] = normalizedVariants.map(
    (variant) => {
      const simulation = simulateWorkflowGraph({
        graph: input.graph,
        branchDecisions: variant.branch_decisions,
        stopAtApproval,
        maxSteps,
      });

      const errorCount = simulation.validation_errors.length;
      const warningCount = simulation.warnings.length;
      const stepCount = simulation.steps.length;
      const score = computeVariantScore({
        completed: simulation.completed,
        stopReason: simulation.stop_reason,
        stepCount,
        warningCount,
        errorCount,
      });

      return {
        id: variant.id,
        label: variant.label,
        branch_decisions: variant.branch_decisions,
        completed: simulation.completed,
        stop_reason: simulation.stop_reason,
        step_count: stepCount,
        warning_count: warningCount,
        error_count: errorCount,
        score,
      };
    }
  );

  const winnerVariantId = selectWinner(variantResults);
  const notes: string[] = [];

  if (input.variants === undefined || input.variants.length < 2) {
    notes.push("No explicit variants were provided. Generated default A/B variants.");
  }

  if (variantResults.every((variant) => !variant.completed)) {
    notes.push(
      "No variant reached a terminal end node. Review condition branches and edge connectivity."
    );
  }

  return {
    ok: true,
    validation_errors: [],
    variants: variantResults,
    winner_variant_id: winnerVariantId,
    notes,
  };
}
