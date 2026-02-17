import { validateWorkflowGraph } from "@/lib/validators/workflow";
import type {
  WorkflowEdgeCondition,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowValidationError,
} from "@/types/workflow";

export interface WorkflowIRTrigger {
  type: "manual" | "schedule" | "event" | "system";
  cron?: string;
  timezone?: string;
}

export interface WorkflowIRNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  config: Record<string, unknown>;
}

export interface WorkflowIREdge {
  from: string;
  to: string;
  when: WorkflowEdgeCondition;
}

export interface WorkflowIR {
  workflow_id: string;
  version: number;
  name: string;
  trigger: WorkflowIRTrigger;
  nodes: WorkflowIRNode[];
  edges: WorkflowIREdge[];
  policies: {
    max_runtime_seconds: number;
    max_retries: number;
  };
}

export interface WorkflowCompileError extends WorkflowValidationError {
  workflow_id: string;
}

interface WorkflowCompileInput {
  workflow_id: string;
  version: number;
  name: string;
  graph: WorkflowGraph;
}

export interface WorkflowCompilerOutput {
  version: 1;
  generated_at: string;
  workflows: WorkflowIR[];
  compile_errors: WorkflowCompileError[];
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function normalizeInteger(value: unknown, fallback: number, min: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(min, Math.trunc(value));
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Math.max(min, Math.trunc(Number(value.trim())));
  }

  return fallback;
}

function buildTrigger(node: WorkflowNode): WorkflowIRTrigger {
  const triggerKindRaw = node.config.trigger_kind;
  const triggerKind =
    typeof triggerKindRaw === "string" ? triggerKindRaw.toLowerCase() : "manual";

  if (triggerKind === "schedule") {
    return {
      type: "schedule",
      cron: normalizeString(node.config.cron, "0 6 * * *"),
      timezone: normalizeString(node.config.timezone, "UTC"),
    };
  }

  if (triggerKind === "event" || triggerKind === "webhook") {
    return { type: "event" };
  }

  if (triggerKind === "system") {
    return { type: "system" };
  }

  return { type: "manual" };
}

function compileOneWorkflow(
  input: WorkflowCompileInput
): { ir: WorkflowIR | null; errors: WorkflowCompileError[] } {
  const validation = validateWorkflowGraph(input.graph);

  if (!validation.valid) {
    return {
      ir: null,
      errors: validation.errors.map((error) => ({
        ...error,
        workflow_id: input.workflow_id,
      })),
    };
  }

  const triggerNode = input.graph.nodes.find((node) => node.type === "trigger");
  if (!triggerNode) {
    return {
      ir: null,
      errors: [
        {
          workflow_id: input.workflow_id,
          code: "TRIGGER_NODE_MISSING",
          message: "Workflow must contain a trigger node before compilation.",
          path: "nodes",
        },
      ],
    };
  }

  const metadata =
    input.graph.metadata && typeof input.graph.metadata === "object"
      ? input.graph.metadata
      : {};

  const policies = {
    max_runtime_seconds: normalizeInteger(
      (metadata as Record<string, unknown>).max_runtime_seconds,
      300,
      1
    ),
    max_retries: normalizeInteger(
      (metadata as Record<string, unknown>).max_retries,
      1,
      0
    ),
  };

  const nodes: WorkflowIRNode[] = input.graph.nodes
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      config: {
        ...node.config,
      },
    }));

  const edges: WorkflowIREdge[] = input.graph.edges
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((edge) => ({
      from: edge.source,
      to: edge.target,
      when: edge.when,
    }));

  return {
    ir: {
      workflow_id: input.workflow_id,
      version: input.version,
      name: input.name,
      trigger: buildTrigger(triggerNode),
      nodes,
      edges,
      policies,
    },
    errors: [],
  };
}

export function compilePublishedWorkflowPack(
  workflows: WorkflowCompileInput[]
): WorkflowCompilerOutput {
  const compiledWorkflows: WorkflowIR[] = [];
  const compileErrors: WorkflowCompileError[] = [];

  const stableInputs = workflows
    .slice()
    .sort((a, b) => a.workflow_id.localeCompare(b.workflow_id));

  for (const workflow of stableInputs) {
    const compiled = compileOneWorkflow(workflow);
    if (compiled.ir) {
      compiledWorkflows.push(compiled.ir);
    }

    if (compiled.errors.length > 0) {
      compileErrors.push(...compiled.errors);
    }
  }

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    workflows: compiledWorkflows,
    compile_errors: compileErrors,
  };
}
