import type { WorkflowGraph, WorkflowTemplate } from "../../types/workflow";

const STARTER_TEMPLATE_TIMESTAMP = "1970-01-01T00:00:00.000Z";

interface StarterTemplateSeed {
  id: string;
  name: string;
  description: string;
  category: string;
  graph: WorkflowGraph;
}

const STARTER_WORKFLOW_TEMPLATE_SEEDS: StarterTemplateSeed[] = [
  {
    id: "starter-blank",
    name: "Blank workflow",
    description: "Start from an empty canvas.",
    category: "foundation",
    graph: {
      nodes: [],
      edges: [],
    },
  },
  {
    id: "starter-lead-response",
    name: "Lead response triage",
    description:
      "Trigger inbound lead, route by qualification score, and close with follow-up.",
    category: "revenue",
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Lead captured",
          position: { x: 120, y: 220 },
          config: {
            trigger_kind: "event",
          },
        },
        {
          id: "con-1",
          type: "condition",
          label: "Qualified lead?",
          position: { x: 360, y: 220 },
          config: {
            expression: "lead_score >= 70",
          },
        },
        {
          id: "act-1",
          type: "action",
          label: "Assign sales owner",
          position: { x: 620, y: 130 },
          config: {},
        },
        {
          id: "act-2",
          type: "action",
          label: "Queue nurture email",
          position: { x: 620, y: 320 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "Done",
          position: { x: 880, y: 220 },
          config: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "tri-1",
          target: "con-1",
          when: "always",
        },
        {
          id: "edge-2",
          source: "con-1",
          target: "act-1",
          when: "true",
        },
        {
          id: "edge-3",
          source: "con-1",
          target: "act-2",
          when: "false",
        },
        {
          id: "edge-4",
          source: "act-1",
          target: "end-1",
          when: "always",
        },
        {
          id: "edge-5",
          source: "act-2",
          target: "end-1",
          when: "always",
        },
      ],
      metadata: {
        jtbd: "Respond to every new lead within SLA and branch by qualification.",
      },
    },
  },
  {
    id: "starter-approval-gate",
    name: "High-risk approval gate",
    description:
      "Run an automated check, request human approval for risky paths, then execute.",
    category: "governance",
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Manual trigger",
          position: { x: 100, y: 180 },
          config: {
            trigger_kind: "manual",
          },
        },
        {
          id: "act-1",
          type: "action",
          label: "Risk scoring",
          position: { x: 350, y: 180 },
          config: {},
        },
        {
          id: "app-1",
          type: "approval",
          label: "Manager approval",
          position: { x: 620, y: 180 },
          config: {
            sla_hours: 24,
          },
        },
        {
          id: "act-2",
          type: "action",
          label: "Execute operation",
          position: { x: 880, y: 180 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "Done",
          position: { x: 1140, y: 180 },
          config: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "tri-1",
          target: "act-1",
          when: "always",
        },
        {
          id: "edge-2",
          source: "act-1",
          target: "app-1",
          when: "always",
        },
        {
          id: "edge-3",
          source: "app-1",
          target: "act-2",
          when: "always",
        },
        {
          id: "edge-4",
          source: "act-2",
          target: "end-1",
          when: "always",
        },
      ],
      metadata: {
        jtbd: "Require explicit human approval before high-risk actions.",
      },
    },
  },
  {
    id: "starter-schedule-ops",
    name: "Scheduled ops check",
    description:
      "Run a scheduled operational check, branch on anomaly detection, and close cleanly.",
    category: "operations",
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Daily schedule",
          position: { x: 120, y: 220 },
          config: {
            trigger_kind: "schedule",
            schedule_cron: "0 6 * * *",
            schedule_timezone: "UTC",
          },
        },
        {
          id: "act-1",
          type: "action",
          label: "Run diagnostics",
          position: { x: 370, y: 220 },
          config: {},
        },
        {
          id: "con-1",
          type: "condition",
          label: "Anomaly detected?",
          position: { x: 620, y: 220 },
          config: {
            expression: "anomaly_detected == true",
          },
        },
        {
          id: "act-2",
          type: "action",
          label: "Open incident",
          position: { x: 890, y: 130 },
          config: {},
        },
        {
          id: "act-3",
          type: "action",
          label: "Record healthy check",
          position: { x: 890, y: 320 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "Done",
          position: { x: 1160, y: 220 },
          config: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "tri-1",
          target: "act-1",
          when: "always",
        },
        {
          id: "edge-2",
          source: "act-1",
          target: "con-1",
          when: "always",
        },
        {
          id: "edge-3",
          source: "con-1",
          target: "act-2",
          when: "true",
        },
        {
          id: "edge-4",
          source: "con-1",
          target: "act-3",
          when: "false",
        },
        {
          id: "edge-5",
          source: "act-2",
          target: "end-1",
          when: "always",
        },
        {
          id: "edge-6",
          source: "act-3",
          target: "end-1",
          when: "always",
        },
      ],
      metadata: {
        jtbd:
          "Execute recurring operational checks and route anomalies immediately.",
      },
    },
  },
];

export function cloneWorkflowGraph(graph: WorkflowGraph): WorkflowGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: {
        ...node.position,
      },
      config:
        typeof node.config === "object" && node.config !== null
          ? { ...node.config }
          : {},
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
    })),
    metadata:
      graph.metadata && typeof graph.metadata === "object"
        ? { ...graph.metadata }
        : undefined,
  };
}

function mapStarterSeedToTemplate(seed: StarterTemplateSeed): WorkflowTemplate {
  return {
    id: seed.id,
    instance_id: null,
    customer_id: null,
    name: seed.name,
    description: seed.description,
    template_kind: "starter",
    latest_version: 1,
    graph: cloneWorkflowGraph(seed.graph),
    metadata: {
      category: seed.category,
      starter: true,
    },
    created_by: null,
    updated_by: null,
    created_at: STARTER_TEMPLATE_TIMESTAMP,
    updated_at: STARTER_TEMPLATE_TIMESTAMP,
  };
}

export function listStarterWorkflowTemplates(): WorkflowTemplate[] {
  return STARTER_WORKFLOW_TEMPLATE_SEEDS.map(mapStarterSeedToTemplate);
}

export function getStarterWorkflowTemplateById(
  templateId: string
): WorkflowTemplate | null {
  const seed = STARTER_WORKFLOW_TEMPLATE_SEEDS.find(
    (template) => template.id === templateId
  );

  if (!seed) {
    return null;
  }

  return mapStarterSeedToTemplate(seed);
}

export function isWorkflowTemplateVisibleToTenant(
  template: WorkflowTemplate,
  instanceId: string,
  customerId: string
): boolean {
  if (template.template_kind === "starter") {
    return true;
  }

  return (
    template.instance_id === instanceId && template.customer_id === customerId
  );
}

function normalizeDescriptionInput(
  description: string | null | undefined
): string | null | undefined {
  if (description === undefined) {
    return undefined;
  }

  if (description === null) {
    return null;
  }

  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

export function buildWorkflowDraftFromTemplate(input: {
  template: WorkflowTemplate;
  name: string;
  description?: string | null;
}): {
  name: string;
  description: string | null;
  graph: WorkflowGraph;
  metadata: Record<string, unknown>;
} {
  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Workflow name is required.");
  }

  const explicitDescription = normalizeDescriptionInput(input.description);
  const fallbackDescription = normalizeDescriptionInput(input.template.description);

  return {
    name: trimmedName,
    description: explicitDescription ?? fallbackDescription ?? null,
    graph: cloneWorkflowGraph(input.template.graph),
    metadata: {
      template_id: input.template.id,
      template_kind: input.template.template_kind,
      template_version: input.template.latest_version,
    },
  };
}
