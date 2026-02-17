import { validateWorkflowGraph } from "@/lib/validators/workflow";
import type { WorkflowGraph, WorkflowValidationResult } from "@/types/workflow";

export function validateWorkflowForRuntime(graph: WorkflowGraph): WorkflowValidationResult {
  return validateWorkflowGraph(graph);
}
