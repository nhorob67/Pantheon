import { validateWorkflowGraph } from "../validators/workflow.ts";
import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from "../../types/workflow";

export type WorkflowSimulationStopReason =
  | "validation_failed"
  | "end_reached"
  | "approval_required"
  | "max_steps_reached"
  | "no_outgoing_edge"
  | "missing_target"
  | "invalid_condition_branch";

export interface WorkflowSimulationStep {
  step_index: number;
  node_id: string;
  node_type: WorkflowNode["type"];
  label: string;
  next_node_id: string | null;
  note: string;
}

export interface WorkflowSimulationResult {
  ok: boolean;
  completed: boolean;
  stop_reason: WorkflowSimulationStopReason;
  steps: WorkflowSimulationStep[];
  warnings: string[];
  validation_errors: ReturnType<typeof validateWorkflowGraph>["errors"];
}

interface WorkflowSimulationInput {
  graph: WorkflowGraph;
  branchDecisions?: Record<string, boolean>;
  maxSteps?: number;
  stopAtApproval?: boolean;
}

function buildOutgoingEdgeMap(graph: WorkflowGraph): Map<string, WorkflowEdge[]> {
  const map = new Map<string, WorkflowEdge[]>();

  for (const edge of graph.edges) {
    const current = map.get(edge.source) || [];
    current.push(edge);
    map.set(edge.source, current);
  }

  for (const [key, edges] of map) {
    map.set(
      key,
      edges.slice().sort((a, b) => {
        if (a.when !== b.when) {
          return a.when.localeCompare(b.when);
        }
        return a.id.localeCompare(b.id);
      })
    );
  }

  return map;
}

function resolveTriggerNode(graph: WorkflowGraph): WorkflowNode | null {
  return (
    graph.nodes
      .filter((node) => node.type === "trigger")
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))[0] || null
  );
}

function resolveNextEdgeForNode(input: {
  node: WorkflowNode;
  outgoingEdges: WorkflowEdge[];
  branchDecisions: Record<string, boolean>;
  warnings: string[];
}): { edge: WorkflowEdge | null; stopReason?: WorkflowSimulationStopReason } {
  const { node, outgoingEdges, branchDecisions, warnings } = input;

  if (outgoingEdges.length === 0) {
    return { edge: null, stopReason: "no_outgoing_edge" };
  }

  if (node.type === "condition") {
    const trueEdge = outgoingEdges.find((edge) => edge.when === "true") || null;
    const falseEdge = outgoingEdges.find((edge) => edge.when === "false") || null;
    const explicitDecision = branchDecisions[node.id];
    const decision =
      explicitDecision !== undefined ? explicitDecision : Boolean(trueEdge);

    if (decision) {
      if (!trueEdge) {
        return { edge: null, stopReason: "invalid_condition_branch" };
      }

      return { edge: trueEdge };
    }

    if (!falseEdge) {
      return { edge: null, stopReason: "invalid_condition_branch" };
    }

    return { edge: falseEdge };
  }

  const alwaysEdges = outgoingEdges.filter((edge) => edge.when === "always");
  const candidateEdges = alwaysEdges.length > 0 ? alwaysEdges : outgoingEdges;

  if (candidateEdges.length > 1) {
    warnings.push(
      `Node ${node.id} has ${candidateEdges.length} outgoing edges; simulation uses the first sorted edge.`
    );
  }

  return { edge: candidateEdges[0] || null };
}

export function simulateWorkflowGraph(
  input: WorkflowSimulationInput
): WorkflowSimulationResult {
  const validation = validateWorkflowGraph(input.graph);
  if (!validation.valid) {
    return {
      ok: false,
      completed: false,
      stop_reason: "validation_failed",
      steps: [],
      warnings: [],
      validation_errors: validation.errors,
    };
  }

  const triggerNode = resolveTriggerNode(input.graph);
  if (!triggerNode) {
    return {
      ok: false,
      completed: false,
      stop_reason: "validation_failed",
      steps: [],
      warnings: [],
      validation_errors: [
        {
          code: "TRIGGER_NODE_MISSING",
          message: "Workflow must include a trigger node for simulation.",
          path: "graph.nodes",
        },
      ],
    };
  }

  const maxSteps = Math.max(1, Math.min(500, input.maxSteps ?? 200));
  const stopAtApproval = input.stopAtApproval ?? true;
  const warnings: string[] = [];
  const steps: WorkflowSimulationStep[] = [];
  const branchDecisions = input.branchDecisions || {};
  const nodeMap = new Map(input.graph.nodes.map((node) => [node.id, node]));
  const outgoingEdges = buildOutgoingEdgeMap(input.graph);

  let currentNode: WorkflowNode | null = triggerNode;
  let stopReason: WorkflowSimulationStopReason = "max_steps_reached";

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    if (!currentNode) {
      stopReason = "missing_target";
      break;
    }

    if (currentNode.type === "end") {
      steps.push({
        step_index: stepIndex,
        node_id: currentNode.id,
        node_type: currentNode.type,
        label: currentNode.label,
        next_node_id: null,
        note: "Reached end node.",
      });
      stopReason = "end_reached";
      break;
    }

    if (currentNode.type === "approval" && stopAtApproval) {
      steps.push({
        step_index: stepIndex,
        node_id: currentNode.id,
        node_type: currentNode.type,
        label: currentNode.label,
        next_node_id: null,
        note: "Paused at approval node (safe simulation mode).",
      });
      stopReason = "approval_required";
      break;
    }

    const nodeOutgoingEdges = outgoingEdges.get(currentNode.id) || [];
    const nextEdgeResult = resolveNextEdgeForNode({
      node: currentNode,
      outgoingEdges: nodeOutgoingEdges,
      branchDecisions,
      warnings,
    });

    if (!nextEdgeResult.edge) {
      stopReason = nextEdgeResult.stopReason || "no_outgoing_edge";
      steps.push({
        step_index: stepIndex,
        node_id: currentNode.id,
        node_type: currentNode.type,
        label: currentNode.label,
        next_node_id: null,
        note:
          stopReason === "invalid_condition_branch"
            ? "Condition branch decision does not map to an outgoing edge."
            : "No outgoing edge available.",
      });
      break;
    }

    steps.push({
      step_index: stepIndex,
      node_id: currentNode.id,
      node_type: currentNode.type,
      label: currentNode.label,
      next_node_id: nextEdgeResult.edge.target,
      note:
        currentNode.type === "condition"
          ? `Condition branch selected: ${nextEdgeResult.edge.when}.`
          : `Traversed edge ${nextEdgeResult.edge.id}.`,
    });

    const nextNode = nodeMap.get(nextEdgeResult.edge.target) || null;
    if (!nextNode) {
      stopReason = "missing_target";
      break;
    }

    currentNode = nextNode;
  }

  const completed = stopReason === "end_reached";

  return {
    ok: completed || stopReason === "approval_required",
    completed,
    stop_reason: stopReason,
    steps,
    warnings,
    validation_errors: [],
  };
}
