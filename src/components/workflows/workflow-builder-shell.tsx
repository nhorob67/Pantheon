"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import {
  EMPTY_WORKFLOW_GRAPH,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowEnvironment,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowNodeType,
  type WorkflowValidationError,
  type WorkflowVersion,
} from "@/types/workflow";
import { validateWorkflowGraph } from "@/lib/validators/workflow";
import {
  NodeLibrary,
  NODE_LIBRARY_TEMPLATES,
  type WorkflowNodeTemplate,
} from "@/components/workflows/node-library";
import {
  WorkflowCanvas,
  type WorkflowCanvasHandle,
} from "@/components/workflows/workflow-canvas";
import { Textarea } from "@/components/ui/textarea";
import { NodeInspector } from "@/components/workflows/node-inspector";
import { ValidationPanel } from "@/components/workflows/validation-panel";
import { WorkflowPerformanceBeacon } from "@/components/workflows/workflow-performance-beacon";
import {
  ArrowLeft,
  Command,
  Download,
  FlaskConical,
  FileInput,
  Keyboard,
  Loader2,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
  Upload,
  X,
} from "lucide-react";

const EMPTY_VERSIONS: WorkflowVersion[] = [];

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

interface WorkflowBuilderShellProps {
  tenantId: string;
  initialWorkflow: WorkflowDefinition;
  initialVersions?: WorkflowVersion[];
}

interface GraphHistoryEntry {
  graph: WorkflowGraph;
  label: string;
  timestamp: number;
}

interface GraphHistoryState {
  entries: GraphHistoryEntry[];
  cursor: number;
}

interface CommandPaletteAction {
  id: string;
  label: string;
  shortcut: string;
  disabled: boolean;
  run: () => void;
}

interface SimulationStepResult {
  step_index: number;
  node_id: string;
  node_type: WorkflowNodeType;
  label: string;
  next_node_id: string | null;
  note: string;
}

interface SimulationResponsePayload {
  ok: boolean;
  completed: boolean;
  stop_reason: string;
  steps: SimulationStepResult[];
  warnings: string[];
  validation_errors: WorkflowValidationError[];
}

interface ExperimentVariantResult {
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

interface ExperimentResponsePayload {
  ok: boolean;
  validation_errors: WorkflowValidationError[];
  variants: ExperimentVariantResult[];
  winner_variant_id: string | null;
  notes: string[];
}

interface PromotionVersionState {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  environment: WorkflowEnvironment;
  version: number;
  source_environment: WorkflowEnvironment | null;
  promotion_note: string | null;
  metadata: Record<string, unknown>;
  promoted_by: string | null;
  promoted_at: string;
  created_at: string;
  updated_at: string;
}

interface PromotionHistoryEvent {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  from_environment: WorkflowEnvironment | null;
  to_environment: WorkflowEnvironment;
  version: number;
  promotion_note: string | null;
  metadata: Record<string, unknown>;
  promoted_by: string | null;
  created_at: string;
}

interface PromotionStatePayload {
  state: {
    by_environment: Record<WorkflowEnvironment, PromotionVersionState | null>;
    versions: PromotionVersionState[];
    history: PromotionHistoryEvent[];
  };
  summary: {
    dev: number | null;
    stage: number | null;
    prod: number | null;
  };
  readiness: {
    can_promote_to_dev: boolean;
    can_promote_to_stage: boolean;
    can_promote_to_prod: boolean;
  };
}

type WorkflowUiBooleanKey =
  | "isManualSaving"
  | "isPublishing"
  | "isRunning"
  | "isRollingBack"
  | "isCommandPaletteOpen"
  | "isExporting"
  | "isImporting"
  | "isSimulating"
  | "isGeneratingDraft"
  | "isEvaluatingExperiment"
  | "isLoadingPromotions"
  | "isPublishingPlaybook"
  | "isRefreshingVersions";

interface WorkflowUiState {
  isManualSaving: boolean;
  isPublishing: boolean;
  isRunning: boolean;
  isRollingBack: boolean;
  isCommandPaletteOpen: boolean;
  isExporting: boolean;
  isImporting: boolean;
  isSimulating: boolean;
  isGeneratingDraft: boolean;
  isEvaluatingExperiment: boolean;
  isLoadingPromotions: boolean;
  isPublishingPlaybook: boolean;
  isRefreshingVersions: boolean;
  isPromotingEnvironment: WorkflowEnvironment | null;
}

type WorkflowUiAction =
  | {
      type: "set-flag";
      key: WorkflowUiBooleanKey;
      value: boolean;
    }
  | {
      type: "set-promoting-environment";
      value: WorkflowEnvironment | null;
    };

const INITIAL_WORKFLOW_UI_STATE: WorkflowUiState = {
  isManualSaving: false,
  isPublishing: false,
  isRunning: false,
  isRollingBack: false,
  isCommandPaletteOpen: false,
  isExporting: false,
  isImporting: false,
  isSimulating: false,
  isGeneratingDraft: false,
  isEvaluatingExperiment: false,
  isLoadingPromotions: false,
  isPublishingPlaybook: false,
  isRefreshingVersions: false,
  isPromotingEnvironment: null,
};

function workflowUiReducer(state: WorkflowUiState, action: WorkflowUiAction): WorkflowUiState {
  switch (action.type) {
    case "set-flag":
      return {
        ...state,
        [action.key]: action.value,
      };
    case "set-promoting-environment":
      return {
        ...state,
        isPromotingEnvironment: action.value,
      };
    default:
      return state;
  }
}

function useWorkflowUiState() {
  const [state, dispatch] = useReducer(workflowUiReducer, INITIAL_WORKFLOW_UI_STATE);

  const setFlag = useCallback((key: WorkflowUiBooleanKey, value: boolean) => {
    dispatch({
      type: "set-flag",
      key,
      value,
    });
  }, []);

  const setPromotingEnvironment = useCallback((value: WorkflowEnvironment | null) => {
    dispatch({
      type: "set-promoting-environment",
      value,
    });
  }, []);

  const isBusy = useMemo(() => {
    return (
      state.isManualSaving ||
      state.isPublishing ||
      state.isRunning ||
      state.isRollingBack ||
      state.isExporting ||
      state.isImporting ||
      state.isSimulating ||
      state.isGeneratingDraft ||
      state.isEvaluatingExperiment ||
      state.isPublishingPlaybook ||
      state.isRefreshingVersions ||
      state.isPromotingEnvironment !== null
    );
  }, [
    state.isManualSaving, state.isPublishing, state.isRunning,
    state.isRollingBack, state.isExporting, state.isImporting,
    state.isSimulating, state.isGeneratingDraft, state.isEvaluatingExperiment,
    state.isPublishingPlaybook, state.isRefreshingVersions,
    state.isPromotingEnvironment,
  ]);

  return {
    state,
    isBusy,
    setFlag,
    setPromotingEnvironment,
  };
}

const HISTORY_LIMIT = 120;
const SHORTCUT_HELP =
  "Cmd/Ctrl+S Save, Cmd/Ctrl+Z Undo, Shift+Cmd/Ctrl+Z Redo, Cmd/Ctrl+D Duplicate, Cmd/Ctrl+K Command Palette, F Fit View, +/- Zoom, Arrow Keys Move selected node, Esc Clear selection.";
const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card";
const FOCUS_RING_DARK_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark";

function cloneGraph(graph: WorkflowGraph): WorkflowGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: {
        ...node.position,
      },
      config: {
        ...node.config,
      },
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
    })),
    metadata: graph.metadata
      ? {
          ...graph.metadata,
        }
      : undefined,
  };
}

function serializeGraph(graph: WorkflowGraph): string {
  return JSON.stringify(graph);
}

function normalizeTagListInput(value: string): string[] {
  const rawTags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(rawTags)).slice(0, 20);
}

function formatTagList(tags: string[]): string {
  if (tags.length === 0) {
    return "";
  }

  return tags.join(", ");
}

function nextNodeId(nodes: WorkflowNode[], type: WorkflowNodeType): string {
  const prefix = type.slice(0, 3);
  for (let index = 1; index <= 10000; index += 1) {
    const candidate = `${prefix}-${index}`;
    if (!nodes.some((node) => node.id === candidate)) {
      return candidate;
    }
  }

  return `${prefix}-${Date.now()}`;
}

function nextEdgeId(edges: WorkflowEdge[]): string {
  for (let index = 1; index <= 10000; index += 1) {
    const candidate = `edge-${index}`;
    if (!edges.some((edge) => edge.id === candidate)) {
      return candidate;
    }
  }

  return `edge-${Date.now()}`;
}

function normalizeValidationErrors(value: unknown): WorkflowValidationError[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as WorkflowValidationError[];
}

function normalizeSimulationResponsePayload(
  value: unknown
): SimulationResponsePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (
    typeof payload.ok !== "boolean" ||
    typeof payload.completed !== "boolean" ||
    typeof payload.stop_reason !== "string"
  ) {
    return null;
  }

  if (
    !Array.isArray(payload.warnings) ||
    !payload.warnings.every((warning) => typeof warning === "string")
  ) {
    return null;
  }

  if (!Array.isArray(payload.steps)) {
    return null;
  }

  const steps: SimulationStepResult[] = [];
  for (const step of payload.steps) {
    if (!step || typeof step !== "object") {
      return null;
    }

    const record = step as Record<string, unknown>;
    if (
      typeof record.step_index !== "number" ||
      typeof record.node_id !== "string" ||
      typeof record.node_type !== "string" ||
      typeof record.label !== "string" ||
      !(typeof record.next_node_id === "string" || record.next_node_id === null) ||
      typeof record.note !== "string"
    ) {
      return null;
    }

    steps.push({
      step_index: record.step_index,
      node_id: record.node_id,
      node_type: record.node_type as WorkflowNodeType,
      label: record.label,
      next_node_id: record.next_node_id,
      note: record.note,
    });
  }

  return {
    ok: payload.ok,
    completed: payload.completed,
    stop_reason: payload.stop_reason,
    steps,
    warnings: payload.warnings,
    validation_errors: normalizeValidationErrors(payload.validation_errors),
  };
}

function normalizeExperimentResponsePayload(
  value: unknown
): ExperimentResponsePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.ok !== "boolean" || !Array.isArray(payload.variants)) {
    return null;
  }

  const variants: ExperimentVariantResult[] = [];
  for (const variant of payload.variants) {
    if (!variant || typeof variant !== "object") {
      return null;
    }

    const record = variant as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.label !== "string" ||
      typeof record.completed !== "boolean" ||
      typeof record.stop_reason !== "string" ||
      typeof record.step_count !== "number" ||
      typeof record.warning_count !== "number" ||
      typeof record.error_count !== "number" ||
      typeof record.score !== "number" ||
      typeof record.branch_decisions !== "object" ||
      record.branch_decisions === null
    ) {
      return null;
    }

    const branchDecisions: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(
      record.branch_decisions as Record<string, unknown>
    )) {
      if (typeof value === "boolean") {
        branchDecisions[key] = value;
      }
    }

    variants.push({
      id: record.id,
      label: record.label,
      completed: record.completed,
      stop_reason: record.stop_reason,
      step_count: record.step_count,
      warning_count: record.warning_count,
      error_count: record.error_count,
      score: record.score,
      branch_decisions: branchDecisions,
    });
  }

  if (
    !Array.isArray(payload.notes) ||
    !payload.notes.every((note) => typeof note === "string")
  ) {
    return null;
  }

  return {
    ok: payload.ok,
    variants,
    winner_variant_id:
      typeof payload.winner_variant_id === "string"
        ? payload.winner_variant_id
        : null,
    notes: payload.notes,
    validation_errors: normalizeValidationErrors(payload.validation_errors),
  };
}

function normalizePromotionVersionState(
  value: unknown
): PromotionVersionState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.workflow_id !== "string" ||
    typeof record.instance_id !== "string" ||
    typeof record.customer_id !== "string" ||
    typeof record.environment !== "string" ||
    typeof record.version !== "number" ||
    typeof record.promoted_at !== "string" ||
    typeof record.created_at !== "string" ||
    typeof record.updated_at !== "string"
  ) {
    return null;
  }

  if (
    record.environment !== "dev" &&
    record.environment !== "stage" &&
    record.environment !== "prod"
  ) {
    return null;
  }

  const sourceEnvironment = record.source_environment;
  const normalizedSourceEnvironment =
    sourceEnvironment === "dev" ||
    sourceEnvironment === "stage" ||
    sourceEnvironment === "prod"
      ? sourceEnvironment
      : null;

  return {
    id: record.id,
    workflow_id: record.workflow_id,
    instance_id: record.instance_id,
    customer_id: record.customer_id,
    environment: record.environment,
    version: record.version,
    source_environment: normalizedSourceEnvironment,
    promotion_note: typeof record.promotion_note === "string" ? record.promotion_note : null,
    metadata:
      typeof record.metadata === "object" &&
      record.metadata !== null &&
      !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : {},
    promoted_by: typeof record.promoted_by === "string" ? record.promoted_by : null,
    promoted_at: record.promoted_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function normalizePromotionHistoryEvent(value: unknown): PromotionHistoryEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.workflow_id !== "string" ||
    typeof record.instance_id !== "string" ||
    typeof record.customer_id !== "string" ||
    typeof record.to_environment !== "string" ||
    typeof record.version !== "number" ||
    typeof record.created_at !== "string"
  ) {
    return null;
  }

  if (
    record.to_environment !== "dev" &&
    record.to_environment !== "stage" &&
    record.to_environment !== "prod"
  ) {
    return null;
  }

  const fromEnvironment = record.from_environment;
  const normalizedFromEnvironment =
    fromEnvironment === "dev" ||
    fromEnvironment === "stage" ||
    fromEnvironment === "prod"
      ? fromEnvironment
      : null;

  return {
    id: record.id,
    workflow_id: record.workflow_id,
    instance_id: record.instance_id,
    customer_id: record.customer_id,
    from_environment: normalizedFromEnvironment,
    to_environment: record.to_environment,
    version: record.version,
    promotion_note: typeof record.promotion_note === "string" ? record.promotion_note : null,
    metadata:
      typeof record.metadata === "object" &&
      record.metadata !== null &&
      !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : {},
    promoted_by: typeof record.promoted_by === "string" ? record.promoted_by : null,
    created_at: record.created_at,
  };
}

function normalizePromotionStatePayload(value: unknown): PromotionStatePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (
    !payload.state ||
    typeof payload.state !== "object" ||
    !payload.summary ||
    typeof payload.summary !== "object" ||
    !payload.readiness ||
    typeof payload.readiness !== "object"
  ) {
    return null;
  }

  const state = payload.state as Record<string, unknown>;
  const summary = payload.summary as Record<string, unknown>;
  const readiness = payload.readiness as Record<string, unknown>;

  const byEnvironment =
    state.by_environment && typeof state.by_environment === "object"
      ? (state.by_environment as Record<string, unknown>)
      : null;
  if (!byEnvironment) {
    return null;
  }

  const dev = normalizePromotionVersionState(byEnvironment.dev);
  const stage = normalizePromotionVersionState(byEnvironment.stage);
  const prod = normalizePromotionVersionState(byEnvironment.prod);

  if (!Array.isArray(state.versions) || !Array.isArray(state.history)) {
    return null;
  }

  const versions = state.versions
    .map((entry) => normalizePromotionVersionState(entry))
    .filter((entry): entry is PromotionVersionState => !!entry);
  const history = state.history
    .map((entry) => normalizePromotionHistoryEvent(entry))
    .filter((entry): entry is PromotionHistoryEvent => !!entry);

  return {
    state: {
      by_environment: {
        dev,
        stage,
        prod,
      },
      versions,
      history,
    },
    summary: {
      dev: typeof summary.dev === "number" ? summary.dev : null,
      stage: typeof summary.stage === "number" ? summary.stage : null,
      prod: typeof summary.prod === "number" ? summary.prod : null,
    },
    readiness: {
      can_promote_to_dev: Boolean(readiness.can_promote_to_dev),
      can_promote_to_stage: Boolean(readiness.can_promote_to_stage),
      can_promote_to_prod: Boolean(readiness.can_promote_to_prod),
    },
  };
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function saveStatusTone(status: SaveStatus): string {
  switch (status) {
    case "saving":
      return "text-accent";
    case "saved":
      return "text-green-300";
    case "error":
    case "conflict":
      return "text-red-300";
    case "dirty":
      return "text-amber-300";
    case "idle":
    default:
      return "text-text-dim";
  }
}

function normalizeWorkflowVersions(value: unknown): WorkflowVersion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is WorkflowVersion => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const candidate = entry as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.workflow_id === "string" &&
        typeof candidate.instance_id === "string" &&
        typeof candidate.customer_id === "string" &&
        typeof candidate.version === "number" &&
        typeof candidate.source === "string" &&
        typeof candidate.graph === "object" &&
        candidate.graph !== null &&
        typeof candidate.created_at === "string"
      );
    })
    .sort((a, b) => b.version - a.version);
}

function formatVersionTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function WorkflowBuilderShell({
  tenantId,
  initialWorkflow,
  initialVersions = EMPTY_VERSIONS,
}: WorkflowBuilderShellProps) {
  const [name, setName] = useState(initialWorkflow.name);
  const [description, setDescription] = useState(initialWorkflow.description ?? "");
  const [tagsInput, setTagsInput] = useState(
    formatTagList(initialWorkflow.tags || [])
  );
  const [ownerId, setOwnerId] = useState(initialWorkflow.owner_id);
  const [draftVersion, setDraftVersion] = useState(initialWorkflow.draft_version);
  const [workflowStatus, setWorkflowStatus] = useState(initialWorkflow.status);
  const [publishedVersion, setPublishedVersion] = useState(
    initialWorkflow.published_version
  );

  const [history, setHistory] = useState<GraphHistoryState>(() => ({
    entries: [
      {
        graph: cloneGraph(initialWorkflow.draft_graph),
        label: "Initial draft",
        timestamp: Date.now(),
      },
    ],
    cursor: 0,
  }));

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const graph = history.entries[history.cursor]?.graph ?? EMPTY_WORKFLOW_GRAPH;

  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    name: initialWorkflow.name,
    description: initialWorkflow.description ?? "",
    tagsSignature: JSON.stringify(initialWorkflow.tags || []),
    graphSignature: serializeGraph(initialWorkflow.draft_graph),
  }));

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const {
    state: workflowUiState,
    isBusy,
    setFlag: setWorkflowUiFlag,
    setPromotingEnvironment: setWorkflowPromotingEnvironment,
  } = useWorkflowUiState();

  const {
    isManualSaving,
    isPublishing,
    isRunning,
    isRollingBack,
    isCommandPaletteOpen,
    isExporting,
    isImporting,
    isSimulating,
    isGeneratingDraft,
    isEvaluatingExperiment,
    isLoadingPromotions,
    isPublishingPlaybook,
    isRefreshingVersions,
  } = workflowUiState;

  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [latestRunId, setLatestRunId] = useState<string | null>(null);
  const [rollbackMessage, setRollbackMessage] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResponsePayload | null>(null);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftGenerationMessage, setDraftGenerationMessage] = useState<string | null>(
    null
  );
  const [draftGenerationError, setDraftGenerationError] = useState<string | null>(
    null
  );
  const [experimentError, setExperimentError] = useState<string | null>(null);
  const [experimentResult, setExperimentResult] =
    useState<ExperimentResponsePayload | null>(null);
  const [promotionState, setPromotionState] = useState<PromotionStatePayload | null>(
    null
  );
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const [playbookSlug, setPlaybookSlug] = useState(() => toSlug(initialWorkflow.name));
  const [playbookVisibility, setPlaybookVisibility] = useState<
    "public" | "private" | "unlisted"
  >("public");
  const [playbookStatus, setPlaybookStatus] = useState<"draft" | "published">(
    "published"
  );
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [playbookMessage, setPlaybookMessage] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<WorkflowVersion[]>(
    normalizeWorkflowVersions(initialVersions)
  );
  const [versionHistoryError, setVersionHistoryError] = useState<string | null>(null);

  const setIsManualSaving = useCallback((value: boolean) => {
    setWorkflowUiFlag("isManualSaving", value);
  }, [setWorkflowUiFlag]);
  const setIsPublishing = useCallback((value: boolean) => {
    setWorkflowUiFlag("isPublishing", value);
  }, [setWorkflowUiFlag]);
  const setIsRunning = useCallback((value: boolean) => {
    setWorkflowUiFlag("isRunning", value);
  }, [setWorkflowUiFlag]);
  const setIsRollingBack = useCallback((value: boolean) => {
    setWorkflowUiFlag("isRollingBack", value);
  }, [setWorkflowUiFlag]);
  const setIsCommandPaletteOpen = useCallback((value: boolean) => {
    setWorkflowUiFlag("isCommandPaletteOpen", value);
  }, [setWorkflowUiFlag]);
  const setIsExporting = useCallback((value: boolean) => {
    setWorkflowUiFlag("isExporting", value);
  }, [setWorkflowUiFlag]);
  const setIsImporting = useCallback((value: boolean) => {
    setWorkflowUiFlag("isImporting", value);
  }, [setWorkflowUiFlag]);
  const setIsSimulating = useCallback((value: boolean) => {
    setWorkflowUiFlag("isSimulating", value);
  }, [setWorkflowUiFlag]);
  const setIsGeneratingDraft = useCallback((value: boolean) => {
    setWorkflowUiFlag("isGeneratingDraft", value);
  }, [setWorkflowUiFlag]);
  const setIsEvaluatingExperiment = useCallback((value: boolean) => {
    setWorkflowUiFlag("isEvaluatingExperiment", value);
  }, [setWorkflowUiFlag]);
  const setIsLoadingPromotions = useCallback((value: boolean) => {
    setWorkflowUiFlag("isLoadingPromotions", value);
  }, [setWorkflowUiFlag]);
  const setIsPublishingPlaybook = useCallback((value: boolean) => {
    setWorkflowUiFlag("isPublishingPlaybook", value);
  }, [setWorkflowUiFlag]);
  const setIsRefreshingVersions = useCallback((value: boolean) => {
    setWorkflowUiFlag("isRefreshingVersions", value);
  }, [setWorkflowUiFlag]);
  const setIsPromotingEnvironment = useCallback((value: WorkflowEnvironment | null) => {
    setWorkflowPromotingEnvironment(value);
  }, [setWorkflowPromotingEnvironment]);

  const [serverValid, setServerValid] = useState(initialWorkflow.is_valid);
  const [serverValidationErrors, setServerValidationErrors] = useState(
    normalizeValidationErrors(initialWorkflow.last_validation_errors)
  );

  const savingRef = useRef(false);
  const canvasRef = useRef<WorkflowCanvasHandle | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const graphRef = useRef(graph);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const graphSignature = useMemo(() => serializeGraph(graph), [graph]);
  const normalizedTags = useMemo(
    () => normalizeTagListInput(tagsInput),
    [tagsInput]
  );
  const localValidation = useMemo(() => validateWorkflowGraph(graph), [graph]);

  const hasUnsavedChanges =
    name !== savedSnapshot.name ||
    description !== savedSnapshot.description ||
    JSON.stringify(normalizedTags) !== savedSnapshot.tagsSignature ||
    graphSignature !== savedSnapshot.graphSignature;

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    return graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [graph.nodes, selectedNodeId]);

  const canUndo = history.cursor > 0;
  const canRedo = history.cursor < history.entries.length - 1;
  const promotionSummary = promotionState?.summary || {
    dev: null,
    stage: null,
    prod: null,
  };
  const promotionReadiness = promotionState?.readiness || {
    can_promote_to_dev: true,
    can_promote_to_stage: false,
    can_promote_to_prod: false,
  };
  const promotionHistoryPreview = promotionState?.state.history.slice(0, 3) || [];

  const applyGraphChange = useCallback(
    (nextGraph: WorkflowGraph, label: string) => {
      setHistory((previous) => {
        const currentGraph = previous.entries[previous.cursor]?.graph ?? EMPTY_WORKFLOW_GRAPH;
        const nextSignature = serializeGraph(nextGraph);
        const currentSignature = serializeGraph(currentGraph);

        if (nextSignature === currentSignature) {
          return previous;
        }

        const headEntries = previous.entries.slice(0, previous.cursor + 1);
        const nextEntries = [
          ...headEntries,
          {
            graph: cloneGraph(nextGraph),
            label,
            timestamp: Date.now(),
          },
        ];

        if (nextEntries.length > HISTORY_LIMIT) {
          nextEntries.splice(0, nextEntries.length - HISTORY_LIMIT);
        }

        return {
          entries: nextEntries,
          cursor: nextEntries.length - 1,
        };
      });

      setSelectedNodeId((previous) => {
        if (!previous) {
          return previous;
        }

        return nextGraph.nodes.some((node) => node.id === previous) ? previous : null;
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setHistory((previous) => {
      if (previous.cursor === 0) {
        return previous;
      }

      return {
        ...previous,
        cursor: previous.cursor - 1,
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((previous) => {
      if (previous.cursor >= previous.entries.length - 1) {
        return previous;
      }

      return {
        ...previous,
        cursor: previous.cursor + 1,
      };
    });
  }, []);

  const handleInsertNodeTemplate = useCallback(
    (template: WorkflowNodeTemplate, position?: { x: number; y: number }) => {
      const currentGraph = graphRef.current;
      const nodeId = nextNodeId(currentGraph.nodes, template.type);
      const fallbackPosition = {
        x: 100 + (currentGraph.nodes.length % 4) * 250,
        y: 120 + Math.floor(currentGraph.nodes.length / 4) * 130,
      };

      const nextNode: WorkflowNode = {
        id: nodeId,
        type: template.type,
        label: template.label,
        position: position || fallbackPosition,
        config: {
          ...template.defaultConfig,
        },
      };

      applyGraphChange(
        {
          ...currentGraph,
          nodes: [...currentGraph.nodes, nextNode],
        },
        `Add ${template.type} node`
      );

      setSelectedNodeId(nodeId);
    },
    [applyGraphChange]
  );

  const handleDropNodeType = useCallback(
    (type: WorkflowNodeType, position: { x: number; y: number }) => {
      const template = NODE_LIBRARY_TEMPLATES.find((item) => item.type === type);
      if (!template) {
        return;
      }

      handleInsertNodeTemplate(template, position);
    },
    [handleInsertNodeTemplate]
  );

  const handleCreateEdge = useCallback(
    (input: Omit<WorkflowEdge, "id">): string | null => {
      const currentGraph = graphRef.current;
      const sourceNode = currentGraph.nodes.find((node) => node.id === input.source);
      if (!sourceNode) {
        return "Source node no longer exists.";
      }

      if (sourceNode.type === "condition" && input.when === "always") {
        return "Condition nodes require true or false branch edges.";
      }

      if (sourceNode.type !== "condition" && input.when !== "always") {
        return "Only condition nodes can emit true/false branches.";
      }

      if (
        sourceNode.type === "condition" &&
        currentGraph.edges.some(
          (edge) => edge.source === input.source && edge.when === input.when
        )
      ) {
        return `Condition node already has a ${input.when} branch.`;
      }

      const nextEdge: WorkflowEdge = {
        id: nextEdgeId(currentGraph.edges),
        source: input.source,
        target: input.target,
        when: sourceNode.type === "condition" ? input.when : "always",
      };

      applyGraphChange(
        {
          ...currentGraph,
          edges: [...currentGraph.edges, nextEdge],
        },
        `Connect ${input.source} -> ${input.target}`
      );

      return null;
    },
    [applyGraphChange]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const currentGraph = graphRef.current;
      const nextEdges = currentGraph.edges.filter((edge) => edge.id !== edgeId);
      applyGraphChange(
        {
          ...currentGraph,
          edges: nextEdges,
        },
        `Delete edge ${edgeId}`
      );
    },
    [applyGraphChange]
  );

  const handleUpdateNode = useCallback(
    (nextNode: WorkflowNode, label: string) => {
      const currentGraph = graphRef.current;
      const nextNodes = currentGraph.nodes.map((node) =>
        node.id === nextNode.id
          ? {
              ...nextNode,
              config: {
                ...nextNode.config,
              },
            }
          : node
      );

      applyGraphChange(
        {
          ...currentGraph,
          nodes: nextNodes,
        },
        label
      );
    },
    [applyGraphChange]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const currentGraph = graphRef.current;
      const nextNodes = currentGraph.nodes.filter((node) => node.id !== nodeId);
      const nextEdges = currentGraph.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );

      applyGraphChange(
        {
          ...currentGraph,
          nodes: nextNodes,
          edges: nextEdges,
        },
        `Delete node ${nodeId}`
      );

      setSelectedNodeId((previous) => (previous === nodeId ? null : previous));
    },
    [applyGraphChange]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const currentGraph = graphRef.current;
      const sourceNode = currentGraph.nodes.find((node) => node.id === nodeId);
      if (!sourceNode) {
        return;
      }

      const duplicateId = nextNodeId(currentGraph.nodes, sourceNode.type);
      const duplicateNode: WorkflowNode = {
        ...sourceNode,
        id: duplicateId,
        label: `${sourceNode.label} Copy`,
        position: {
          x: sourceNode.position.x + 40,
          y: sourceNode.position.y + 40,
        },
        config: {
          ...sourceNode.config,
        },
      };

      applyGraphChange(
        {
          ...currentGraph,
          nodes: [...currentGraph.nodes, duplicateNode],
        },
        `Duplicate node ${nodeId}`
      );

      setSelectedNodeId(duplicateId);
    },
    [applyGraphChange]
  );

  const handleNudgeSelectedNode = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!selectedNodeId) {
        return;
      }

      const currentGraph = graphRef.current;
      const sourceNode = currentGraph.nodes.find((node) => node.id === selectedNodeId);
      if (!sourceNode) {
        return;
      }

      const nextNode: WorkflowNode = {
        ...sourceNode,
        position: {
          x: Math.max(0, sourceNode.position.x + deltaX),
          y: Math.max(0, sourceNode.position.y + deltaY),
        },
      };

      handleUpdateNode(nextNode, `Move ${sourceNode.id}`);
    },
    [handleUpdateNode, selectedNodeId]
  );

  const persistDraft = useCallback(
    async (mode: "autosave" | "manual" | "publish"): Promise<boolean> => {
      const nextName = name.trim();

      if (!nextName) {
        setSaveStatus("error");
        setSaveMessage("Workflow name is required.");
        return false;
      }

      if (!hasUnsavedChanges && mode !== "publish") {
        if (mode === "manual") {
          setSaveStatus("saved");
          setSaveMessage("Draft already up to date.");
        }
        return true;
      }

      if (savingRef.current) {
        return false;
      }

      savingRef.current = true;
      if (mode === "manual") {
        setIsManualSaving(true);
      }
      setSaveStatus("saving");
      setSaveMessage(mode === "autosave" ? "Autosaving draft..." : "Saving draft...");

      try {
        const response = await fetch(
          `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              expected_draft_version: draftVersion,
              name: nextName,
              description: description.trim().length > 0 ? description.trim() : null,
              tags: normalizedTags,
              owner_id: ownerId,
              graph,
            }),
          }
        );

        const payload = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;

        if (!response.ok) {
          if (response.status === 409 && payload.code === "WORKFLOW_VERSION_CONFLICT") {
            setSaveStatus("conflict");
            setSaveMessage("Draft conflict detected. Refreshing draft version.");

            if (typeof payload.current_draft_version === "number") {
              setDraftVersion(payload.current_draft_version);
            }

            return false;
          }

          setSaveStatus("error");
          setSaveMessage(
            typeof payload.error === "string"
              ? payload.error
              : "Failed to save workflow draft."
          );
          return false;
        }

        const workflow = payload.workflow as WorkflowDefinition | undefined;
        if (!workflow) {
          setSaveStatus("error");
          setSaveMessage("Save completed but no workflow payload was returned.");
          return false;
        }

        setName(workflow.name);
        setDescription(workflow.description ?? "");
        setTagsInput(formatTagList(workflow.tags));
        setOwnerId(workflow.owner_id);
        setDraftVersion(workflow.draft_version);
        setWorkflowStatus(workflow.status);
        setPublishedVersion(workflow.published_version);
        setServerValid(workflow.is_valid);
        setServerValidationErrors(
          normalizeValidationErrors(workflow.last_validation_errors)
        );

        setSavedSnapshot({
          name: workflow.name,
          description: workflow.description ?? "",
          tagsSignature: JSON.stringify(workflow.tags),
          graphSignature: serializeGraph(workflow.draft_graph),
        });

        setSaveStatus("saved");
        setSaveMessage(
          mode === "autosave"
            ? `Autosaved at ${new Date().toLocaleTimeString()}`
            : "Draft saved."
        );

        return true;
      } catch {
        setSaveStatus("error");
        setSaveMessage("Failed to save workflow draft.");
        return false;
      } finally {
        savingRef.current = false;
        setIsManualSaving(false);
      }
    },
    [
      description,
      draftVersion,
      graph,
      hasUnsavedChanges,
      initialWorkflow.id,
      tenantId,
      name,
      normalizedTags,
      ownerId,
      setIsManualSaving,
    ]
  );

  const reloadVersionHistory = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setIsRefreshingVersions(true);
      }
      setVersionHistoryError(null);

      try {
        const response = await fetch(
          `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}`,
          {
            method: "GET",
          }
        );

        const payload = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;

        if (!response.ok) {
          setVersionHistoryError(
            typeof payload.error === "string"
              ? payload.error
              : "Failed to refresh version history."
          );
          return;
        }

        setVersionHistory(normalizeWorkflowVersions(payload.versions));
      } catch {
        setVersionHistoryError("Failed to refresh version history.");
      } finally {
        if (showLoader) {
          setIsRefreshingVersions(false);
        }
      }
    },
    [initialWorkflow.id, tenantId, setIsRefreshingVersions]
  );

  const reloadPromotions = useCallback(async () => {
    setIsLoadingPromotions(true);
    setPromotionError(null);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/promotions`,
        {
          method: "GET",
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setPromotionError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to load promotion state."
        );
        return;
      }

      const normalized = normalizePromotionStatePayload(payload);
      if (!normalized) {
        setPromotionError("Promotion state response payload was invalid.");
        return;
      }

      setPromotionState(normalized);
    } catch {
      setPromotionError("Failed to load promotion state.");
    } finally {
      setIsLoadingPromotions(false);
    }
  }, [initialWorkflow.id, tenantId, setIsLoadingPromotions]);

  const handlePublish = useCallback(async () => {
    setPublishError(null);
    setPublishMessage(null);
    setRunError(null);
    setRunMessage(null);
    setLatestRunId(null);
    setRollbackError(null);
    setRollbackMessage(null);

    if (!localValidation.valid) {
      setPublishError("Resolve validation errors before publishing.");
      return;
    }

    const saved = await persistDraft("publish");
    if (!saved) {
      setPublishError("Save failed. Resolve draft save issues and retry publish.");
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/publish`,
        {
          method: "POST",
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        if (response.status === 409 && payload.code === "WORKFLOW_INVALID") {
          const errors = normalizeValidationErrors(payload.errors);
          setServerValid(false);
          setServerValidationErrors(errors);
          setPublishError("Publish blocked: workflow is invalid.");
          return;
        }

        setPublishError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to publish workflow."
        );
        return;
      }

      const workflow = payload.workflow as WorkflowDefinition | undefined;

      if (workflow) {
        setWorkflowStatus(workflow.status);
        setPublishedVersion(workflow.published_version);
        setDraftVersion(workflow.draft_version);
        setServerValid(workflow.is_valid);
        setServerValidationErrors(
          normalizeValidationErrors(workflow.last_validation_errors)
        );
      } else {
        setWorkflowStatus("published");
        setPublishedVersion(draftVersion);
      }

      setPublishMessage(
        `Draft v${draftVersion} published. You can now launch runs from this builder.`
      );
      void reloadVersionHistory(false);
      void reloadPromotions();
    } catch {
      setPublishError("Failed to publish workflow.");
    } finally {
      setIsPublishing(false);
    }
  }, [
    draftVersion,
    initialWorkflow.id,
    tenantId,
    localValidation.valid,
    persistDraft,
    reloadPromotions,
    reloadVersionHistory,
    setIsPublishing,
  ]);

  const handleRun = useCallback(async () => {
    setRunError(null);
    setRunMessage(null);
    setLatestRunId(null);

    if (workflowStatus !== "published" || !publishedVersion) {
      setRunError("Publish this workflow before launching a run.");
      return;
    }

    if (savingRef.current || isPublishing) {
      setRunError("A save/publish operation is still in progress. Retry in a moment.");
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trigger_type: "manual",
            metadata: {
              requested_from: "workflow_builder_ui",
            },
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setRunError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to queue workflow run."
        );
        return;
      }

      const run = payload.run as { id?: unknown } | undefined;
      if (run && typeof run.id === "string") {
        setLatestRunId(run.id);
      }

      setRunMessage(
        typeof payload.message === "string"
          ? payload.message
          : "Workflow run queued."
      );
    } catch {
      setRunError("Failed to queue workflow run.");
    } finally {
      setIsRunning(false);
    }
  }, [
    initialWorkflow.id,
    tenantId,
    isPublishing,
    publishedVersion,
    setIsRunning,
    workflowStatus,
  ]);

  const handleRollback = useCallback(async (targetVersion?: number | null) => {
    setRollbackError(null);
    setRollbackMessage(null);
    setPublishError(null);
    setPublishMessage(null);
    setRunError(null);
    setRunMessage(null);
    setLatestRunId(null);

    if (workflowStatus !== "published" || !publishedVersion) {
      setRollbackError("Publish this workflow before attempting rollback.");
      return;
    }

    if (targetVersion !== undefined && targetVersion !== null) {
      if (targetVersion >= publishedVersion) {
        setRollbackError(
          "Rollback target must be older than the currently published version."
        );
        return;
      }
    } else if (publishedVersion <= 1) {
      setRollbackError("No prior published version is available for rollback.");
      return;
    }

    if (savingRef.current || isPublishing || isRunning) {
      setRollbackError(
        "A save/publish/run operation is in progress. Retry rollback in a moment."
      );
      return;
    }

    const rollbackTargetLabel =
      targetVersion !== undefined && targetVersion !== null
        ? `v${targetVersion}`
        : "the previous published version";
    const confirmed = window.confirm(
      `Rollback workflow from published v${publishedVersion} to ${rollbackTargetLabel}? This redeploys runtime configuration for this instance.`
    );

    if (!confirmed) {
      return;
    }

    setIsRollingBack(true);
    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/rollback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_version:
              targetVersion !== undefined && targetVersion !== null
                ? targetVersion
                : undefined,
            reason: "Requested from workflow builder UI",
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setRollbackError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to rollback workflow."
        );
        return;
      }

      const workflow = payload.workflow as WorkflowDefinition | undefined;
      if (workflow) {
        setWorkflowStatus(workflow.status);
        setPublishedVersion(workflow.published_version);
        setDraftVersion(workflow.draft_version);
        setServerValid(workflow.is_valid);
        setServerValidationErrors(
          normalizeValidationErrors(workflow.last_validation_errors)
        );
      }

      const fromVersion =
        typeof payload.from_version === "number"
          ? payload.from_version
          : publishedVersion;
      const toVersion =
        typeof payload.to_version === "number"
          ? payload.to_version
          : workflow?.published_version || null;

      if (toVersion) {
        setRollbackMessage(`Published version rolled back: v${fromVersion} -> v${toVersion}.`);
      } else {
        setRollbackMessage("Workflow rollback completed.");
      }
      void reloadVersionHistory(false);
      void reloadPromotions();
    } catch {
      setRollbackError("Failed to rollback workflow.");
    } finally {
      setIsRollingBack(false);
    }
  }, [
    initialWorkflow.id,
    tenantId,
    isPublishing,
    isRunning,
    publishedVersion,
    reloadPromotions,
    reloadVersionHistory,
    setIsRollingBack,
    workflowStatus,
  ]);

  const handleExport = useCallback(async () => {
    setExportError(null);
    setExportMessage(null);
    setIsExporting(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/export`,
        {
          method: "GET",
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setExportError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to export workflow JSON."
        );
        return;
      }

      const fileNameBase = name.trim().length > 0 ? name.trim() : "workflow";
      const fileName = `${fileNameBase
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "workflow"}-export.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setExportMessage("Workflow JSON exported.");
    } catch {
      setExportError("Failed to export workflow JSON.");
    } finally {
      setIsExporting(false);
    }
  }, [initialWorkflow.id, tenantId, name, setIsExporting]);

  const handleImportButton = useCallback(() => {
    importFileInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!file) {
        return;
      }

      setImportError(null);
      setImportMessage(null);
      setIsImporting(true);

      try {
        const rawText = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          setImportError("Selected file is not valid JSON.");
          return;
        }

        const response = await fetch(`/api/tenants/${tenantId}/workflows/import`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document: parsed,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;

        if (!response.ok) {
          setImportError(
            typeof payload.error === "string"
              ? payload.error
              : "Failed to import workflow JSON."
          );
          return;
        }

        const workflow = payload.workflow as { id?: unknown } | undefined;
        if (!workflow || typeof workflow.id !== "string") {
          setImportError("Import completed, but workflow payload was missing.");
          return;
        }

        setImportMessage("Workflow imported. Redirecting to imported draft...");
        window.location.href = `/settings/workflows/${workflow.id}`;
      } catch {
        setImportError("Failed to import workflow JSON.");
      } finally {
        setIsImporting(false);
      }
    },
    [tenantId, setIsImporting]
  );

  const handleSimulate = useCallback(async () => {
    setSimulationError(null);
    setSimulationResult(null);
    setIsSimulating(true);

    try {
      const metadata =
        graph.metadata && typeof graph.metadata === "object"
          ? (graph.metadata as Record<string, unknown>)
          : {};
      const rawBranchDecisions = metadata.simulation_branch_decisions;
      const branchDecisions: Record<string, boolean> = {};
      if (
        rawBranchDecisions &&
        typeof rawBranchDecisions === "object" &&
        !Array.isArray(rawBranchDecisions)
      ) {
        for (const [key, value] of Object.entries(rawBranchDecisions)) {
          if (typeof value === "boolean" && key.trim().length > 0) {
            branchDecisions[key] = value;
          }
        }
      }

      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/simulate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            graph,
            branch_decisions: branchDecisions,
            stop_at_approval: true,
            max_steps: 200,
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setSimulationError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to run workflow simulation."
        );
        return;
      }

      const normalizedPayload = normalizeSimulationResponsePayload(payload);
      if (!normalizedPayload) {
        setSimulationError("Simulation response payload was invalid.");
        return;
      }

      setSimulationResult(normalizedPayload);
    } catch {
      setSimulationError("Failed to run workflow simulation.");
    } finally {
      setIsSimulating(false);
    }
  }, [graph, initialWorkflow.id, tenantId, setIsSimulating]);

  const handlePromoteEnvironment = useCallback(
    async (targetEnvironment: WorkflowEnvironment) => {
      setPromotionError(null);
      setPromotionMessage(null);

      if (workflowStatus !== "published" || !publishedVersion) {
        setPromotionError("Publish workflow before promoting environments.");
        return;
      }

      setIsPromotingEnvironment(targetEnvironment);
      try {
        const response = await fetch(
          `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/promotions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              target_environment: targetEnvironment,
              note: "Promoted from workflow builder UI",
            }),
          }
        );

        const payload = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;

        if (!response.ok) {
          setPromotionError(
            typeof payload.error === "string"
              ? payload.error
              : "Failed to promote environment."
          );
          return;
        }

        const normalized = normalizePromotionStatePayload(payload);
        if (!normalized) {
          setPromotionError("Promotion response payload was invalid.");
          return;
        }

        setPromotionState(normalized);
        setPromotionMessage(
          `Promoted workflow v${publishedVersion} to ${targetEnvironment}.`
        );
      } catch {
        setPromotionError("Failed to promote environment.");
      } finally {
        setIsPromotingEnvironment(null);
      }
    },
    [initialWorkflow.id, tenantId, publishedVersion, setIsPromotingEnvironment, workflowStatus]
  );

  const handleGenerateDraft = useCallback(async () => {
    setDraftGenerationError(null);
    setDraftGenerationMessage(null);

    const prompt = draftPrompt.trim();
    if (prompt.length < 10) {
      setDraftGenerationError("Enter a prompt with at least 10 characters.");
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/workflows/generate-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          name: name.trim(),
          description: description.trim().length > 0 ? description.trim() : null,
          max_nodes: 40,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setDraftGenerationError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to generate workflow draft."
        );
        return;
      }

      const draft = payload.draft as Record<string, unknown> | undefined;
      if (!draft || typeof draft !== "object") {
        setDraftGenerationError("Draft generation response was invalid.");
        return;
      }

      const generatedGraph = draft.graph;
      if (
        !generatedGraph ||
        typeof generatedGraph !== "object" ||
        !Array.isArray((generatedGraph as { nodes?: unknown }).nodes) ||
        !Array.isArray((generatedGraph as { edges?: unknown }).edges)
      ) {
        setDraftGenerationError("Generated draft did not include a valid graph.");
        return;
      }

      applyGraphChange(generatedGraph as WorkflowGraph, "Generate draft from prompt");

      if (typeof draft.name === "string" && draft.name.trim().length > 0) {
        setName(draft.name.trim());
      }

      if (typeof draft.description === "string") {
        setDescription(draft.description);
      }

      const capabilities = Array.isArray(payload.detected_capabilities)
        ? payload.detected_capabilities.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [];

      setDraftGenerationMessage(
        capabilities.length > 0
          ? `Draft generated (${capabilities.join(", ")}).`
          : "Draft generated from prompt."
      );
    } catch {
      setDraftGenerationError("Failed to generate workflow draft.");
    } finally {
      setIsGeneratingDraft(false);
    }
  }, [applyGraphChange, description, draftPrompt, tenantId, name, setIsGeneratingDraft]);

  const handleEvaluateExperiment = useCallback(async () => {
    setExperimentError(null);
    setExperimentResult(null);
    setIsEvaluatingExperiment(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/workflows/${initialWorkflow.id}/experiment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            graph,
            stop_at_approval: true,
            max_steps: 200,
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setExperimentError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to evaluate experiment."
        );
        return;
      }

      const normalized = normalizeExperimentResponsePayload(payload);
      if (!normalized) {
        setExperimentError("Experiment response payload was invalid.");
        return;
      }

      setExperimentResult(normalized);
    } catch {
      setExperimentError("Failed to evaluate experiment.");
    } finally {
      setIsEvaluatingExperiment(false);
    }
  }, [graph, initialWorkflow.id, tenantId, setIsEvaluatingExperiment]);

  const handlePublishPlaybook = useCallback(async () => {
    setPlaybookError(null);
    setPlaybookMessage(null);

    if (workflowStatus !== "published" || !publishedVersion) {
      setPlaybookError("Publish this workflow before creating a playbook.");
      return;
    }

    const slug = toSlug(playbookSlug || name);
    if (slug.length < 3) {
      setPlaybookError("Playbook slug must be at least 3 characters.");
      return;
    }

    setIsPublishingPlaybook(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/workflow-playbooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow_id: initialWorkflow.id,
          slug,
          name: name.trim() || initialWorkflow.name,
          description: description.trim().length > 0 ? description.trim() : null,
          summary:
            description.trim().length > 0
              ? description.trim().slice(0, 280)
              : null,
          category: normalizedTags[0] || null,
          tags: normalizedTags,
          visibility: playbookVisibility,
          status: playbookStatus,
          metadata: {
            source: "workflow_builder_ui",
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setPlaybookError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to publish workflow playbook."
        );
        return;
      }

      const playbook = payload.playbook as { slug?: unknown } | undefined;
      if (playbook && typeof playbook.slug === "string") {
        setPlaybookSlug(playbook.slug);
      }

      setPlaybookMessage(
        typeof payload.created === "boolean" && payload.created
          ? "Playbook published to marketplace catalog."
          : "Playbook updated with a new version."
      );
    } catch {
      setPlaybookError("Failed to publish workflow playbook.");
    } finally {
      setIsPublishingPlaybook(false);
    }
  }, [
    description,
    initialWorkflow.id,
    initialWorkflow.name,
    tenantId,
    name,
    normalizedTags,
    playbookSlug,
    playbookStatus,
    playbookVisibility,
    publishedVersion,
    setIsPublishingPlaybook,
    workflowStatus,
  ]);

  const handleFitView = useCallback(() => {
    canvasRef.current?.fitView();
  }, []);

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, []);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, [setIsCommandPaletteOpen]);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setCommandQuery("");
  }, [setIsCommandPaletteOpen]);

  const commandActions = useMemo<CommandPaletteAction[]>(
    () => [
      {
        id: "save",
        label: "Save draft",
        shortcut: "Cmd/Ctrl+S",
        disabled: isManualSaving,
        run: () => {
          void persistDraft("manual");
        },
      },
      {
        id: "undo",
        label: "Undo",
        shortcut: "Cmd/Ctrl+Z",
        disabled: !canUndo,
        run: handleUndo,
      },
      {
        id: "redo",
        label: "Redo",
        shortcut: "Shift+Cmd/Ctrl+Z",
        disabled: !canRedo,
        run: handleRedo,
      },
      {
        id: "duplicate",
        label: "Duplicate selected node",
        shortcut: "Cmd/Ctrl+D",
        disabled: !selectedNodeId,
        run: () => {
          if (selectedNodeId) {
            handleDuplicateNode(selectedNodeId);
          }
        },
      },
      {
        id: "delete",
        label: "Delete selected node",
        shortcut: "Delete / Backspace",
        disabled: !selectedNodeId,
        run: () => {
          if (selectedNodeId) {
            handleDeleteNode(selectedNodeId);
          }
        },
      },
      {
        id: "fit",
        label: "Fit view",
        shortcut: "F",
        disabled: false,
        run: handleFitView,
      },
      {
        id: "zoom-in",
        label: "Zoom in",
        shortcut: "+",
        disabled: false,
        run: handleZoomIn,
      },
      {
        id: "zoom-out",
        label: "Zoom out",
        shortcut: "-",
        disabled: false,
        run: handleZoomOut,
      },
      {
        id: "run",
        label: "Run workflow",
        shortcut: "Run",
        disabled:
          isRunning ||
          isPublishing ||
          workflowStatus !== "published" ||
          !publishedVersion,
        run: () => {
          void handleRun();
        },
      },
      {
        id: "simulate",
        label: "Simulate workflow",
        shortcut: "Simulate",
        disabled: isSimulating,
        run: () => {
          void handleSimulate();
        },
      },
      {
        id: "experiment",
        label: "Evaluate A/B experiment",
        shortcut: "Experiment",
        disabled: isEvaluatingExperiment,
        run: () => {
          void handleEvaluateExperiment();
        },
      },
      {
        id: "export-json",
        label: "Export workflow JSON",
        shortcut: "Export",
        disabled: isExporting,
        run: () => {
          void handleExport();
        },
      },
      {
        id: "import-json",
        label: "Import workflow JSON",
        shortcut: "Import",
        disabled: isImporting,
        run: handleImportButton,
      },
    ],
    [
      canRedo,
      canUndo,
      handleDeleteNode,
      handleDuplicateNode,
      handleFitView,
      handleRedo,
      handleRun,
      handleEvaluateExperiment,
      handleSimulate,
      handleUndo,
      handleZoomIn,
      handleZoomOut,
      handleExport,
      handleImportButton,
      isEvaluatingExperiment,
      isExporting,
      isImporting,
      isManualSaving,
      isPublishing,
      isRunning,
      isSimulating,
      publishedVersion,
      selectedNodeId,
      workflowStatus,
      persistDraft,
    ]
  );

  const filteredCommandActions = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) {
      return commandActions;
    }

    return commandActions.filter((command) => {
      return (
        command.label.toLowerCase().includes(query) ||
        command.shortcut.toLowerCase().includes(query)
      );
    });
  }, [commandActions, commandQuery]);

  const runCommandAction = useCallback(
    (command: CommandPaletteAction) => {
      if (command.disabled) {
        return;
      }

      closeCommandPalette();
      command.run();
    },
    [closeCommandPalette]
  );

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    if (!savingRef.current) {
      setSaveStatus((previous) => (previous === "saving" ? previous : "dirty"));
      setSaveMessage("Unsaved changes");
    }

    const timeoutId = window.setTimeout(() => {
      if (!isBusy) {
        void persistDraft("autosave");
      }
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasUnsavedChanges, isBusy, persistDraft]);

  useEffect(() => {
    if (!isCommandPaletteOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      commandInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    void reloadPromotions();
  }, [reloadPromotions]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        Boolean(target?.isContentEditable);

      const hasModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (hasModifier && key === "k") {
        event.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      if (event.key === "Escape") {
        if (isCommandPaletteOpen) {
          event.preventDefault();
          closeCommandPalette();
          return;
        }

        if (!isTextInput && selectedNodeId) {
          event.preventDefault();
          setSelectedNodeId(null);
        }
        return;
      }

      if (isCommandPaletteOpen) {
        return;
      }

      if (hasModifier && key === "s") {
        event.preventDefault();
        void persistDraft("manual");
        return;
      }

      if (hasModifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (hasModifier && key === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (!isTextInput && hasModifier && key === "d") {
        if (selectedNodeId) {
          event.preventDefault();
          handleDuplicateNode(selectedNodeId);
        }
        return;
      }

      if (!isTextInput && key === "f") {
        event.preventDefault();
        handleFitView();
        return;
      }

      if (
        !isTextInput &&
        (event.key === "+" || (event.key === "=" && event.shiftKey))
      ) {
        event.preventDefault();
        handleZoomIn();
        return;
      }

      if (!isTextInput && (event.key === "-" || event.key === "_")) {
        event.preventDefault();
        handleZoomOut();
        return;
      }

      if (!isTextInput && selectedNodeId) {
        const step = event.shiftKey ? 40 : 10;
        switch (event.key) {
          case "ArrowLeft":
            event.preventDefault();
            handleNudgeSelectedNode(-step, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            handleNudgeSelectedNode(step, 0);
            return;
          case "ArrowUp":
            event.preventDefault();
            handleNudgeSelectedNode(0, -step);
            return;
          case "ArrowDown":
            event.preventDefault();
            handleNudgeSelectedNode(0, step);
            return;
          default:
            break;
        }
      }

      if (!isTextInput && (event.key === "Delete" || event.key === "Backspace")) {
        if (selectedNodeId) {
          event.preventDefault();
          handleDeleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [
    closeCommandPalette,
    handleDeleteNode,
    handleDuplicateNode,
    handleFitView,
    handleNudgeSelectedNode,
    handleRedo,
    handleUndo,
    handleZoomIn,
    handleZoomOut,
    isCommandPaletteOpen,
    openCommandPalette,
    persistDraft,
    selectedNodeId,
  ]);

  return (
    <div className="space-y-4">
      <WorkflowPerformanceBeacon tenantId={tenantId} routeKind="builder" />
      <input
        ref={importFileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          void handleImportFileChange(event);
        }}
      />
      <div className="rounded-2xl border border-border bg-bg-card/70 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href="/settings/workflows"
              className={`mb-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs text-text-dim transition-colors hover:text-text-secondary ${FOCUS_RING_CLASS}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to workflow list
            </Link>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <label htmlFor="workflow-name-input" className="sr-only">
                Workflow name
              </label>
              <input
                id="workflow-name-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`w-full min-w-0 rounded-lg border border-border bg-bg-dark px-3 py-2 font-headline text-lg font-semibold text-text-primary ${FOCUS_RING_DARK_CLASS}`}
                placeholder="Workflow name"
              />

              <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs text-text-secondary">
                {workflowStatus}
              </span>
            </div>

            <Textarea
              id="workflow-description-input"
              label="Workflow description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className={`mt-2 w-full bg-bg-dark text-sm text-text-secondary ${FOCUS_RING_DARK_CLASS}`}
              placeholder="Describe this workflow"
            />

            <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label htmlFor="workflow-tags-input" className="sr-only">
                  Workflow tags
                </label>
                <input
                  id="workflow-tags-input"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  className={`w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-secondary ${FOCUS_RING_DARK_CLASS}`}
                  placeholder="Tags (comma separated): onboarding, approval, schedule"
                />
              </div>

              <div className="rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-dim">
                Owner:{" "}
                {ownerId ? `${ownerId.slice(0, 8)}...` : "Unassigned"}
              </div>
            </div>

            <div
              className="mt-3 flex flex-wrap items-center gap-2 text-xs"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className={saveStatusTone(saveStatus)}>
                {saveMessage || "No changes"}
              </span>
              <span className="text-text-dim">Draft v{draftVersion}</span>
              <span className="text-text-dim">
                Tags: {normalizedTags.length > 0 ? normalizedTags.join(", ") : "none"}
              </span>
              <span
                className={serverValid ? "text-green-300" : "text-amber-300"}
              >
                Last saved validation: {serverValid ? "valid" : "invalid"}
              </span>
              {publishedVersion && (
                <span className="text-text-dim">Published v{publishedVersion}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </button>

            <button
              type="button"
              onClick={() => void persistDraft("manual")}
              disabled={isBusy}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              {isManualSaving ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isBusy}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export JSON
            </button>

            <button
              type="button"
              onClick={handleImportButton}
              disabled={isBusy}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <FileInput className="h-4 w-4" />
              )}
              Import JSON
            </button>

            <button
              type="button"
              onClick={handleSimulate}
              disabled={isBusy}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
              title="Runs an in-browser-safe simulation only. No runtime dispatch."
            >
              {isSimulating ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              Simulate
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isBusy || !localValidation.valid}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg-deep transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Publish
            </button>

            <button
              type="button"
              onClick={() => {
                void handleRollback(null);
              }}
              disabled={
                isBusy ||
                workflowStatus !== "published" ||
                !publishedVersion ||
                publishedVersion <= 1
              }
              title={
                workflowStatus === "published"
                  ? "Rollback to the previous published version"
                  : "Publish workflow before rollback."
              }
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              {isRollingBack ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Rollback
            </button>

            <button
              type="button"
              onClick={handleRun}
              disabled={
                isBusy ||
                workflowStatus !== "published" ||
                !publishedVersion
              }
              title={
                workflowStatus === "published"
                  ? "Queue workflow run"
                  : "Publish workflow before running."
              }
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run
            </button>

            <Link
              href={`/settings/workflows/runs?workflow_id=${initialWorkflow.id}`}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
            >
              Runs
            </Link>

            <Link
              href={`/settings/workflows/approvals?workflow_id=${initialWorkflow.id}`}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
            >
              Approvals
            </Link>

            <Link
              href="/settings/workflows/playbooks"
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
            >
              Playbooks
            </Link>

            <button
              type="button"
              onClick={openCommandPalette}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
              title={SHORTCUT_HELP}
            >
              <Command className="h-4 w-4" />
              Command Palette
            </button>
          </div>
        </div>

        {(publishMessage ||
          publishError ||
          runMessage ||
          runError ||
          rollbackMessage ||
          rollbackError ||
          exportMessage ||
          exportError ||
          importMessage ||
          importError ||
          simulationError) && (
          <div className="mt-3 space-y-2">
            {(publishMessage || publishError) && (
              <p
                className={`rounded-lg border px-3 py-2 text-xs ${
                  publishError
                    ? "border-destructive/30 bg-destructive/10 text-red-200"
                    : "border-green-500/30 bg-green-500/10 text-green-200"
                }`}
              >
                {publishError || publishMessage}
              </p>
            )}
            {(runMessage || runError) && (
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  runError
                    ? "border-destructive/30 bg-destructive/10 text-red-200"
                    : "border-green-500/30 bg-green-500/10 text-green-200"
                }`}
              >
                <p>{runError || runMessage}</p>
                {latestRunId && !runError && (
                  <Link
                    href={`/settings/workflows/runs?workflow_id=${initialWorkflow.id}&run_id=${latestRunId}`}
                    className={`mt-1 inline-flex rounded text-xs font-medium text-accent hover:text-accent-light ${FOCUS_RING_CLASS}`}
                  >
                    View run timeline
                  </Link>
                )}
              </div>
            )}
            {(rollbackMessage || rollbackError) && (
              <p
                className={`rounded-lg border px-3 py-2 text-xs ${
                  rollbackError
                    ? "border-destructive/30 bg-destructive/10 text-red-200"
                    : "border-green-500/30 bg-green-500/10 text-green-200"
                }`}
              >
                {rollbackError || rollbackMessage}
              </p>
            )}
            {(exportMessage || exportError) && (
              <p
                className={`rounded-lg border px-3 py-2 text-xs ${
                  exportError
                    ? "border-destructive/30 bg-destructive/10 text-red-200"
                    : "border-green-500/30 bg-green-500/10 text-green-200"
                }`}
              >
                {exportError || exportMessage}
              </p>
            )}
            {(importMessage || importError) && (
              <p
                className={`rounded-lg border px-3 py-2 text-xs ${
                  importError
                    ? "border-destructive/30 bg-destructive/10 text-red-200"
                    : "border-green-500/30 bg-green-500/10 text-green-200"
                }`}
              >
                {importError || importMessage}
              </p>
            )}
            {simulationError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-200">
                {simulationError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <NodeLibrary onInsertNode={handleInsertNodeTemplate} />

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <h4 className="font-headline text-sm font-semibold text-text-primary">
              Editor History
            </h4>
            <p className="mt-1 text-xs text-text-dim">
              Current action: {history.entries[history.cursor]?.label || "-"}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs text-text-dim">
              <Keyboard className="h-3.5 w-3.5" />
              {SHORTCUT_HELP}
            </p>
          </section>
        </div>

        <WorkflowCanvas
          ref={canvasRef}
          graph={graph}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onDropNodeType={handleDropNodeType}
          onCreateEdge={handleCreateEdge}
          onDeleteEdge={handleDeleteEdge}
        />

        <div className="space-y-4">
          <NodeInspector
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
          />
          <ValidationPanel
            errors={localValidation.errors}
            onFocusNode={(nodeId) => setSelectedNodeId(nodeId)}
          />

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-headline text-sm font-semibold text-text-primary">
                Natural Language Draft
              </h4>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isBusy}
                className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                {isGeneratingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs text-text-dim">
              Describe the workflow in plain language and replace the current draft.
            </p>
            <Textarea
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              rows={3}
              className={`mt-2 w-full bg-bg-dark px-2 py-2 text-xs text-text-secondary ${FOCUS_RING_DARK_CLASS}`}
              placeholder="Example: Every weekday at 6am, run diagnostics, if risk score is high require manager approval, otherwise continue and end."
            />
            {draftGenerationError && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-red-200">
                {draftGenerationError}
              </p>
            )}
            {draftGenerationMessage && !draftGenerationError && (
              <p className="mt-2 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] text-green-200">
                {draftGenerationMessage}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-headline text-sm font-semibold text-text-primary">
                Simulation Preview
              </h4>
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isBusy}
                className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                {isSimulating ? (
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                ) : (
                  <FlaskConical className="h-3.5 w-3.5" />
                )}
                Run simulation
              </button>
            </div>
            <p className="mt-1 text-xs text-text-dim">
              Safe branch testing only. No runtime dispatch, deploy, or side effects.
            </p>

            {!simulationResult ? (
              <p className="mt-2 text-xs text-text-dim">
                Run simulation to preview traversal path.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-text-secondary">
                  Stop reason: {simulationResult.stop_reason} • Steps:{" "}
                  {simulationResult.steps.length}
                </p>
                {simulationResult.warnings.length > 0 && (
                  <div className="space-y-1">
                    {simulationResult.warnings.map((warning) => (
                      <p
                        key={warning}
                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
                      >
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
                <div className="max-h-48 space-y-1 overflow-auto pr-1">
                  {simulationResult.steps.map((step) => (
                    <p
                      key={`${step.step_index}-${step.node_id}`}
                      className="rounded-md border border-border bg-bg-dark/40 px-2 py-1 text-[11px] text-text-secondary"
                    >
                      {step.step_index + 1}. {step.label} ({step.node_type}){" "}
                      {step.next_node_id ? `-> ${step.next_node_id}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-headline text-sm font-semibold text-text-primary">
                Experiment Mode (A/B)
              </h4>
              <button
                type="button"
                onClick={handleEvaluateExperiment}
                disabled={isBusy}
                className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                {isEvaluatingExperiment ? (
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                ) : (
                  <FlaskConical className="h-3.5 w-3.5" />
                )}
                Evaluate
              </button>
            </div>
            <p className="mt-1 text-xs text-text-dim">
              Evaluates branch variants and ranks the winner by completion, warnings,
              and step count.
            </p>

            {experimentError && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-red-200">
                {experimentError}
              </p>
            )}

            {!experimentResult ? (
              <p className="mt-2 text-xs text-text-dim">
                Run evaluation to generate default A/B branch variants.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {experimentResult.notes.map((note) => (
                  <p
                    key={note}
                    className="rounded-md border border-border bg-bg-dark/40 px-2 py-1 text-[11px] text-text-dim"
                  >
                    {note}
                  </p>
                ))}

                <div className="max-h-40 space-y-1 overflow-auto pr-1">
                  {experimentResult.variants
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((variant) => (
                      <p
                        key={variant.id}
                        className={`rounded-md border px-2 py-1 text-[11px] ${
                          experimentResult.winner_variant_id === variant.id
                            ? "border-accent/60 bg-accent/10 text-text-primary"
                            : "border-border bg-bg-dark/40 text-text-secondary"
                        }`}
                      >
                        {variant.label} ({variant.id}) • score {variant.score} •{" "}
                        {variant.stop_reason} • {variant.step_count} steps
                      </p>
                    ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-headline text-sm font-semibold text-text-primary">
                Environment Promotion
              </h4>
              <button
                type="button"
                onClick={() => {
                  void reloadPromotions();
                }}
                disabled={isLoadingPromotions}
                className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                {isLoadingPromotions ? (
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Refresh
              </button>
            </div>
            <p className="mt-1 text-xs text-text-dim">
              Promote published versions through dev, stage, and prod.
            </p>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-md border border-border bg-bg-dark/30 px-2 py-1 text-[11px] text-text-secondary">
                Dev: {promotionSummary.dev ? `v${promotionSummary.dev}` : "—"}
              </div>
              <div className="rounded-md border border-border bg-bg-dark/30 px-2 py-1 text-[11px] text-text-secondary">
                Stage: {promotionSummary.stage ? `v${promotionSummary.stage}` : "—"}
              </div>
              <div className="rounded-md border border-border bg-bg-dark/30 px-2 py-1 text-[11px] text-text-secondary">
                Prod: {promotionSummary.prod ? `v${promotionSummary.prod}` : "—"}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  void handlePromoteEnvironment("dev");
                }}
                disabled={
                  isBusy ||
                  workflowStatus !== "published" ||
                  !publishedVersion ||
                  !promotionReadiness.can_promote_to_dev
                }
                className={`inline-flex min-h-8 items-center rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                Promote to Dev
              </button>
              <button
                type="button"
                onClick={() => {
                  void handlePromoteEnvironment("stage");
                }}
                disabled={
                  isBusy ||
                  workflowStatus !== "published" ||
                  !publishedVersion ||
                  !promotionReadiness.can_promote_to_stage
                }
                className={`inline-flex min-h-8 items-center rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                Promote to Stage
              </button>
              <button
                type="button"
                onClick={() => {
                  void handlePromoteEnvironment("prod");
                }}
                disabled={
                  isBusy ||
                  workflowStatus !== "published" ||
                  !publishedVersion ||
                  !promotionReadiness.can_promote_to_prod
                }
                className={`inline-flex min-h-8 items-center rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                Promote to Prod
              </button>
            </div>

            {promotionError && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-red-200">
                {promotionError}
              </p>
            )}
            {promotionMessage && !promotionError && (
              <p className="mt-2 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] text-green-200">
                {promotionMessage}
              </p>
            )}

            {promotionHistoryPreview.length > 0 && (
              <div className="mt-2 space-y-1">
                {promotionHistoryPreview.map((event) => (
                  <p
                    key={event.id}
                    className="rounded-md border border-border bg-bg-dark/40 px-2 py-1 text-[11px] text-text-dim"
                  >
                    {formatVersionTimestamp(event.created_at)} • {event.to_environment} •
                    v{event.version}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <h4 className="font-headline text-sm font-semibold text-text-primary">
              Publish as Playbook
            </h4>
            <p className="mt-1 text-xs text-text-dim">
              Package this workflow as a reusable marketplace playbook version.
            </p>

            <div className="mt-2 space-y-2">
              <input
                value={playbookSlug}
                onChange={(event) => setPlaybookSlug(event.target.value)}
                className={`w-full rounded-md border border-border bg-bg-dark px-2 py-1.5 text-xs text-text-secondary ${FOCUS_RING_DARK_CLASS}`}
                placeholder="playbook-slug"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={playbookVisibility}
                  onChange={(event) =>
                    setPlaybookVisibility(
                      event.target.value as "public" | "private" | "unlisted"
                    )
                  }
                  className={`rounded-md border border-border bg-bg-dark px-2 py-1.5 text-xs text-text-secondary ${FOCUS_RING_DARK_CLASS}`}
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="unlisted">unlisted</option>
                </select>
                <select
                  value={playbookStatus}
                  onChange={(event) =>
                    setPlaybookStatus(event.target.value as "draft" | "published")
                  }
                  className={`rounded-md border border-border bg-bg-dark px-2 py-1.5 text-xs text-text-secondary ${FOCUS_RING_DARK_CLASS}`}
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handlePublishPlaybook}
                disabled={
                  isBusy ||
                  workflowStatus !== "published" ||
                  !publishedVersion
                }
                className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                {isPublishingPlaybook ? (
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Publish playbook
              </button>
            </div>

            {playbookError && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-red-200">
                {playbookError}
              </p>
            )}
            {playbookMessage && !playbookError && (
              <p className="mt-2 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] text-green-200">
                {playbookMessage}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-headline text-sm font-semibold text-text-primary">
                Version History
              </h4>
              <button
                type="button"
                onClick={() => {
                  void reloadVersionHistory(true);
                }}
                disabled={isRefreshingVersions}
                className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                {isRefreshingVersions ? (
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Refresh
              </button>
            </div>
            <p className="mt-1 text-xs text-text-dim">
              Inspect snapshots and rollback to a specific prior version.
            </p>

            {versionHistoryError && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-red-200">
                {versionHistoryError}
              </p>
            )}

            {versionHistory.length === 0 ? (
              <p className="mt-2 text-xs text-text-dim">
                No workflow versions were returned for this draft.
              </p>
            ) : (
              <div className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
                {versionHistory.map((version) => {
                  const canRollbackToVersion =
                    workflowStatus === "published" &&
                    !!publishedVersion &&
                    version.version < publishedVersion;
                  const isCurrentPublished =
                    !!publishedVersion && version.version === publishedVersion;

                  return (
                    <div
                      key={version.id}
                      className={`rounded-md border px-2 py-1 ${
                        isCurrentPublished
                          ? "border-accent/60 bg-accent/10"
                          : "border-border bg-bg-dark/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-text-secondary">
                          v{version.version} • {version.source} •{" "}
                          {formatVersionTimestamp(version.created_at)}
                        </p>
                        {isCurrentPublished ? (
                          <span className="text-[11px] font-medium text-accent">
                            Current published
                          </span>
                        ) : canRollbackToVersion ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleRollback(version.version);
                            }}
                            disabled={isBusy}
                            className={`inline-flex min-h-7 items-center rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING_CLASS}`}
                          >
                            Rollback to v{version.version}
                          </button>
                        ) : (
                          <span className="text-[11px] text-text-dim">View only</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-bg-card/80 p-4">
            <h4 className="font-headline text-sm font-semibold text-text-primary">
              Saved Validation Snapshot
            </h4>
            <p className="mt-1 text-xs text-text-dim">
              Server recorded {serverValidationErrors.length} issue
              {serverValidationErrors.length === 1 ? "" : "s"} for the latest saved
              draft.
            </p>
          </section>
        </div>
      </div>

      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeCommandPalette}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Workflow command palette"
            className="absolute left-1/2 top-24 w-[min(720px,92vw)] -translate-x-1/2 rounded-2xl border border-border bg-bg-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-3">
              <Command className="h-4 w-4 text-text-dim" />
              <label htmlFor="workflow-command-palette-search" className="sr-only">
                Search command palette
              </label>
              <input
                id="workflow-command-palette-search"
                ref={commandInputRef}
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const firstEnabled = filteredCommandActions.find(
                      (command) => !command.disabled
                    );
                    if (firstEnabled) {
                      event.preventDefault();
                      runCommandAction(firstEnabled);
                    }
                  }
                }}
                placeholder="Search commands or shortcuts..."
                className={`w-full rounded-md bg-transparent px-1 text-sm text-text-primary placeholder:text-text-dim ${FOCUS_RING_CLASS}`}
              />
              <button
                type="button"
                onClick={closeCommandPalette}
                className={`rounded-md p-2 text-text-dim transition-colors hover:bg-bg-dark/60 hover:text-text-primary ${FOCUS_RING_CLASS}`}
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-auto p-2">
              {filteredCommandActions.length === 0 ? (
                <p className="rounded-lg border border-border bg-bg-dark/40 px-3 py-2 text-sm text-text-dim">
                  No commands matched your query.
                </p>
              ) : (
                filteredCommandActions.map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    disabled={command.disabled}
                    onClick={() => runCommandAction(command)}
                    className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-bg-dark/60 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING_CLASS}`}
                  >
                    <span className="text-text-primary">{command.label}</span>
                    <span className="rounded-md border border-border bg-bg-dark/60 px-2 py-0.5 text-xs text-text-secondary">
                      {command.shortcut}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-border px-3 py-2 text-xs text-text-dim">
              Keyboard map: {SHORTCUT_HELP}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
