import { validateWorkflowGraph } from "../validators/workflow.ts";
import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from "../../types/workflow";

type NaturalLanguageTriggerKind = "manual" | "schedule" | "event";

export interface WorkflowNLDraftGenerationInput {
  prompt: string;
  name?: string;
  description?: string | null;
  preferredTrigger?: NaturalLanguageTriggerKind;
  maxNodes?: number;
}

export interface WorkflowNLDraftGenerationOutput {
  draft: {
    name: string;
    description: string | null;
    graph: WorkflowGraph;
  };
  assumptions: string[];
  warnings: string[];
  detected_capabilities: string[];
}

interface DraftFeatureDetection {
  triggerKind: NaturalLanguageTriggerKind;
  cron: string;
  timezone: string;
  hasCondition: boolean;
  hasApproval: boolean;
  hasDelay: boolean;
  hasHandoff: boolean;
  delaySeconds: number;
}

const DEFAULT_MAX_NODES = 20;
const MIN_MAX_NODES = 3;
const MAX_MAX_NODES = 100;

function clampMaxNodes(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_MAX_NODES;
  }

  return Math.max(MIN_MAX_NODES, Math.min(MAX_MAX_NODES, Math.trunc(value)));
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  for (const term of terms) {
    if (text.includes(term)) {
      return true;
    }
  }

  return false;
}

function inferTimezone(prompt: string): string {
  const timezoneMatch = prompt.match(/[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?/);
  if (timezoneMatch && timezoneMatch[0]) {
    return timezoneMatch[0];
  }

  if (includesAny(prompt.toLowerCase(), ["utc", "zulu"])) {
    return "UTC";
  }

  return "UTC";
}

function inferCron(prompt: string): string {
  const normalized = prompt.toLowerCase();

  if (includesAny(normalized, ["hourly", "every hour"])) {
    return "0 * * * *";
  }

  if (includesAny(normalized, ["every weekday", "weekdays", "business day"])) {
    return "0 9 * * 1-5";
  }

  if (includesAny(normalized, ["weekly", "every week"])) {
    return "0 9 * * 1";
  }

  if (includesAny(normalized, ["monthly", "every month"])) {
    return "0 9 1 * *";
  }

  return "0 6 * * *";
}

function inferDelaySeconds(prompt: string): number {
  const normalized = prompt.toLowerCase();
  const match = normalized.match(/(\d+)\s*(second|sec|minute|min|hour|day)s?/);
  if (!match) {
    return 300;
  }

  const amount = Number(match[1] || "0");
  const unit = match[2] || "second";
  if (!Number.isFinite(amount) || amount <= 0) {
    return 300;
  }

  if (unit === "second" || unit === "sec") {
    return Math.min(86400, Math.max(1, Math.trunc(amount)));
  }

  if (unit === "minute" || unit === "min") {
    return Math.min(86400, Math.max(1, Math.trunc(amount * 60)));
  }

  if (unit === "hour") {
    return Math.min(86400, Math.max(1, Math.trunc(amount * 3600)));
  }

  return Math.min(86400, Math.max(1, Math.trunc(amount * 86400)));
}

function detectFeatures(input: {
  normalizedPrompt: string;
  rawPrompt: string;
  preferredTrigger?: NaturalLanguageTriggerKind;
}): DraftFeatureDetection {
  const { normalizedPrompt, rawPrompt, preferredTrigger } = input;

  const eventTrigger = includesAny(normalizedPrompt, [
    "webhook",
    "event",
    "incoming",
    "inbound",
    "on new",
    "when a",
  ]);
  const scheduleTrigger = includesAny(normalizedPrompt, [
    "schedule",
    "cron",
    "daily",
    "weekly",
    "monthly",
    "every",
  ]);

  let triggerKind: NaturalLanguageTriggerKind = "manual";
  if (preferredTrigger) {
    triggerKind = preferredTrigger;
  } else if (eventTrigger) {
    triggerKind = "event";
  } else if (scheduleTrigger) {
    triggerKind = "schedule";
  }

  return {
    triggerKind,
    cron: inferCron(rawPrompt),
    timezone: inferTimezone(rawPrompt),
    hasCondition: includesAny(normalizedPrompt, [
      "if",
      "condition",
      "branch",
      "score",
      "qualified",
      "true",
      "false",
    ]),
    hasApproval: includesAny(normalizedPrompt, [
      "approval",
      "approve",
      "review",
      "manager",
      "human",
      "sign-off",
    ]),
    hasDelay: includesAny(normalizedPrompt, ["delay", "wait", "after", "cooldown"]),
    hasHandoff: includesAny(normalizedPrompt, [
      "handoff",
      "escalate",
      "route to",
      "assign to",
      "transfer",
    ]),
    delaySeconds: inferDelaySeconds(rawPrompt),
  };
}

function formatGeneratedName(prompt: string): string {
  const sentence = prompt
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\r\n]+/g, " ");

  if (sentence.length === 0) {
    return "Generated Workflow";
  }

  const trimmed = sentence.slice(0, 72).replace(/[.,;:!?]+$/, "");
  return trimmed.length > 0 ? trimmed : "Generated Workflow";
}

function buildFallbackGraph(prompt: string): WorkflowGraph {
  const triggerNode: WorkflowNode = {
    id: "tri-1",
    type: "trigger",
    label: "Trigger",
    position: { x: 120, y: 220 },
    config: {
      trigger_kind: "manual",
    },
  };

  const actionNode: WorkflowNode = {
    id: "act-1",
    type: "action",
    label: "Primary action",
    position: { x: 360, y: 220 },
    config: {
      action_key: "generated_primary_action",
      prompt_template: prompt.trim(),
    },
  };

  const endNode: WorkflowNode = {
    id: "end-1",
    type: "end",
    label: "Done",
    position: { x: 620, y: 220 },
    config: {
      summary: "Generated from natural language prompt.",
    },
  };

  const edges: WorkflowEdge[] = [
    {
      id: "edge-1",
      source: triggerNode.id,
      target: actionNode.id,
      when: "always",
    },
    {
      id: "edge-2",
      source: actionNode.id,
      target: endNode.id,
      when: "always",
    },
  ];

  return {
    nodes: [triggerNode, actionNode, endNode],
    edges,
    metadata: {
      draft_origin: "nl_generator",
      generation_mode: "fallback",
    },
  };
}

function buildGraphFromFeatures(input: {
  prompt: string;
  maxNodes: number;
  features: DraftFeatureDetection;
}): WorkflowGraph {
  const counters: Record<WorkflowNode["type"], number> = {
    trigger: 0,
    action: 0,
    condition: 0,
    delay: 0,
    handoff: 0,
    approval: 0,
    end: 0,
  };

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const positionFor = (index: number, branch: "center" | "upper" | "lower") => {
    const y = branch === "upper" ? 120 : branch === "lower" ? 330 : 220;
    return {
      x: 120 + index * 240,
      y,
    };
  };

  const addNode = (
    type: WorkflowNode["type"],
    label: string,
    config: Record<string, unknown>,
    branch: "center" | "upper" | "lower" = "center"
  ): string | null => {
    if (nodes.length >= input.maxNodes) {
      return null;
    }

    counters[type] += 1;
    const id = `${type.slice(0, 3)}-${counters[type]}`;
    nodes.push({
      id,
      type,
      label,
      position: positionFor(nodes.length - 1, branch),
      config,
    });

    return id;
  };

  const addEdge = (
    source: string | null,
    target: string | null,
    when: WorkflowEdge["when"] = "always"
  ) => {
    if (!source || !target) {
      return;
    }

    edges.push({
      id: `edge-${edges.length + 1}`,
      source,
      target,
      when,
    });
  };

  const triggerNodeId = addNode(
    "trigger",
    input.features.triggerKind === "schedule"
      ? "Scheduled trigger"
      : input.features.triggerKind === "event"
        ? "Event trigger"
        : "Manual trigger",
    {
      trigger_kind: input.features.triggerKind,
      cron: input.features.cron,
      timezone: input.features.timezone,
    }
  );

  const primaryActionId = addNode("action", "Prepare context", {
    action_key: "generated_prepare_context",
    prompt_template: input.prompt.trim().slice(0, 400),
  });
  addEdge(triggerNodeId, primaryActionId);

  let terminalNodeIds: Array<string | null> = [];

  if (input.features.hasCondition) {
    const conditionId = addNode("condition", "Decision branch", {
      expression: "context.should_follow_primary_path == true",
    });
    addEdge(primaryActionId, conditionId);

    const trueStartId = input.features.hasApproval
      ? addNode(
          "approval",
          "Human review",
          {
            reviewer_group: "operations",
            reviewer_role: "manager",
            sla_minutes: 120,
            instructions:
              "Review generated recommendation and approve or reject before execution.",
            require_comment_on_reject: true,
          },
          "upper"
        )
      : addNode(
          "action",
          "Primary branch action",
          {
            action_key: "generated_primary_branch",
          },
          "upper"
        );

    const falseStartId = input.features.hasDelay
      ? addNode(
          "delay",
          "Wait before fallback",
          {
            delay_seconds: input.features.delaySeconds,
          },
          "lower"
        )
      : addNode(
          "action",
          "Fallback branch action",
          {
            action_key: "generated_fallback_branch",
          },
          "lower"
        );

    addEdge(conditionId, trueStartId, "true");
    addEdge(conditionId, falseStartId, "false");

    let trueTailId = trueStartId;
    let falseTailId = falseStartId;

    if (input.features.hasHandoff) {
      const trueHandoffId = addNode(
        "handoff",
        "Escalate specialist",
        {
          handoff_agent_key: "specialist",
        },
        "upper"
      );
      const falseHandoffId = addNode(
        "handoff",
        "Escalate fallback specialist",
        {
          handoff_agent_key: "fallback-specialist",
        },
        "lower"
      );

      addEdge(trueTailId, trueHandoffId);
      addEdge(falseTailId, falseHandoffId);

      trueTailId = trueHandoffId;
      falseTailId = falseHandoffId;
    }

    terminalNodeIds = [trueTailId, falseTailId];
  } else {
    let cursorId = primaryActionId;

    if (input.features.hasApproval) {
      const approvalId = addNode("approval", "Human approval", {
        reviewer_group: "operations",
        reviewer_role: "manager",
        sla_minutes: 120,
        instructions: "Approve workflow execution before continuing.",
        require_comment_on_reject: true,
      });
      addEdge(cursorId, approvalId);
      cursorId = approvalId;
    }

    if (input.features.hasDelay) {
      const delayId = addNode("delay", "Delay", {
        delay_seconds: input.features.delaySeconds,
      });
      addEdge(cursorId, delayId);
      cursorId = delayId;
    }

    if (input.features.hasHandoff) {
      const handoffId = addNode("handoff", "Handoff", {
        handoff_agent_key: "specialist",
      });
      addEdge(cursorId, handoffId);
      cursorId = handoffId;
    }

    const finalActionId = addNode("action", "Execute action", {
      action_key: "generated_execute_action",
    });
    addEdge(cursorId, finalActionId);
    terminalNodeIds = [finalActionId];
  }

  const endNodeId = addNode("end", "Done", {
    summary: "Generated from natural language prompt.",
  });

  for (const terminalNodeId of terminalNodeIds) {
    addEdge(terminalNodeId, endNodeId, "always");
  }

  return {
    nodes,
    edges,
    metadata: {
      draft_origin: "nl_generator",
      generated_at: new Date().toISOString(),
      source_prompt: input.prompt.trim().slice(0, 1000),
    },
  };
}

export function generateWorkflowDraftFromNaturalLanguage(
  input: WorkflowNLDraftGenerationInput
): WorkflowNLDraftGenerationOutput {
  const prompt = input.prompt.trim();
  const normalizedPrompt = normalizePrompt(prompt);
  const maxNodes = clampMaxNodes(input.maxNodes);
  const features = detectFeatures({
    normalizedPrompt,
    rawPrompt: prompt,
    preferredTrigger: input.preferredTrigger,
  });

  const detectedCapabilities = [
    features.triggerKind === "schedule" ? "schedule_trigger" : null,
    features.triggerKind === "event" ? "event_trigger" : null,
    features.hasCondition ? "condition_branching" : null,
    features.hasApproval ? "human_approval" : null,
    features.hasDelay ? "delay_step" : null,
    features.hasHandoff ? "handoff_step" : null,
  ].filter((value): value is string => !!value);

  const assumptions: string[] = [
    `Trigger inferred as ${features.triggerKind}.`,
    features.triggerKind === "schedule"
      ? `Schedule inferred as ${features.cron} (${features.timezone}).`
      : "No explicit schedule requested; used non-cron trigger settings.",
  ];

  const warnings: string[] = [];
  if (!features.hasCondition) {
    warnings.push(
      "No explicit branch logic detected. Generated a linear workflow path."
    );
  }

  if (!features.hasApproval) {
    warnings.push(
      "No explicit human review requirement detected. Approval node was not added."
    );
  }

  let graph = buildGraphFromFeatures({
    prompt,
    maxNodes,
    features,
  });

  const validation = validateWorkflowGraph(graph);
  if (!validation.valid) {
    graph = buildFallbackGraph(prompt);
    warnings.push(
      "Initial generated graph did not pass structural validation; fallback graph was used."
    );
  }

  const generatedName = input.name?.trim().length
    ? input.name.trim()
    : formatGeneratedName(prompt);

  const generatedDescription =
    input.description === undefined
      ? `Generated from natural language prompt on ${new Date().toISOString()}.`
      : input.description;

  return {
    draft: {
      name: generatedName,
      description:
        generatedDescription && generatedDescription.trim().length > 0
          ? generatedDescription
          : null,
      graph,
    },
    assumptions,
    warnings,
    detected_capabilities: detectedCapabilities,
  };
}
