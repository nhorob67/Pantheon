"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import type {
  WorkflowEdge,
  WorkflowEdgeCondition,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
} from "@/types/workflow";
import { WORKFLOW_NODE_DRAG_MIME } from "@/components/workflows/node-library";
import { ArrowRight, Link2, Minus, Plus, Target, Trash2 } from "lucide-react";

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 900;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 78;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;
const VIRTUALIZATION_THRESHOLD = 140;
const VIRTUALIZATION_BUFFER = 260;
const MAX_EDGE_LIST_ITEMS = 220;
const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card";

interface CanvasViewportState {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface RenderedEdge {
  edge: WorkflowEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

function nodeBadgeClass(type: WorkflowNodeType): string {
  switch (type) {
    case "trigger":
      return "bg-green-500/15 text-green-300";
    case "action":
      return "bg-accent-dim text-accent";
    case "approval":
      return "bg-amber-500/15 text-amber-200";
    case "condition":
      return "bg-blue-500/15 text-blue-300";
    case "delay":
      return "bg-purple-500/15 text-purple-300";
    case "handoff":
      return "bg-cyan-500/15 text-cyan-300";
    case "end":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-muted text-text-secondary";
  }
}

function clampPosition(value: number, max: number): number {
  return Math.max(20, Math.min(max, value));
}

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

interface NodeLayerProps {
  nodes: WorkflowNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const NodeLayer = memo(
  function NodeLayer({ nodes, selectedNodeId, onSelectNode }: NodeLayerProps) {
    return (
      <>
        {nodes.map((node) => {
          const active = selectedNodeId === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectNode(node.id);
              }}
              className={`absolute rounded-xl border p-3 text-left transition-colors ${FOCUS_RING_CLASS} ${
                active
                  ? "border-accent bg-accent-dim/30 shadow-[0_0_0_1px_rgba(217,140,46,0.3)]"
                  : "border-border bg-bg-card/90 hover:border-border-light"
              }`}
              style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH }}
              aria-pressed={active}
              aria-label={`${node.label} ${node.type} node`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${nodeBadgeClass(
                    node.type
                  )}`}
                >
                  {node.type}
                </span>
                <span className="text-[10px] text-text-dim">{node.id}</span>
              </div>
              <p className="mt-2 truncate text-sm font-medium text-text-primary">{node.label}</p>
            </button>
          );
        })}
      </>
    );
  },
  (previous, next) =>
    previous.nodes === next.nodes &&
    previous.selectedNodeId === next.selectedNodeId &&
    previous.onSelectNode === next.onSelectNode
);

NodeLayer.displayName = "NodeLayer";

interface EdgeLayerProps {
  renderedEdges: RenderedEdge[];
}

const EdgeLayer = memo(
  function EdgeLayer({ renderedEdges }: EdgeLayerProps) {
    return (
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <marker
            id="workflow-edge-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(240,236,228,0.45)" />
          </marker>
        </defs>
        {renderedEdges.map((item) => (
          <g key={item.edge.id}>
            <line
              x1={item.x1}
              y1={item.y1}
              x2={item.x2}
              y2={item.y2}
              stroke="rgba(240,236,228,0.35)"
              strokeWidth={1.5}
              markerEnd="url(#workflow-edge-arrow)"
            />
            {item.edge.when !== "always" && (
              <text
                x={item.midX}
                y={item.midY - 4}
                textAnchor="middle"
                fill="rgba(240,236,228,0.75)"
                fontSize="10"
              >
                {item.edge.when}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  },
  (previous, next) => previous.renderedEdges === next.renderedEdges
);

EdgeLayer.displayName = "EdgeLayer";

export interface WorkflowCanvasHandle {
  fitView: () => void;
  centerCanvas: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onDropNodeType: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
  onCreateEdge: (edge: Omit<WorkflowEdge, "id">) => string | null;
  onDeleteEdge: (edgeId: string) => void;
}

const DEFAULT_VIEWPORT: CanvasViewportState = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

export const WorkflowCanvas = forwardRef<WorkflowCanvasHandle, WorkflowCanvasProps>(
  function WorkflowCanvas(
    {
      graph,
      selectedNodeId,
      onSelectNode,
      onDropNodeType,
      onCreateEdge,
      onDeleteEdge,
    },
    ref
  ) {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [connectSource, setConnectSource] = useState("");
    const [connectTarget, setConnectTarget] = useState("");
    const [connectWhen, setConnectWhen] = useState<WorkflowEdgeCondition>("always");
    const [connectError, setConnectError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [viewportState, setViewportState] = useState<CanvasViewportState>(
      DEFAULT_VIEWPORT
    );

    const nodeMap = useMemo(
      () => new Map(graph.nodes.map((node) => [node.id, node])),
      [graph.nodes]
    );

    const nodeSelectOptions = useMemo(
      () =>
        graph.nodes.map((node) => ({
          id: node.id,
          label: node.label,
        })),
      [graph.nodes]
    );

    const sourceNode = connectSource ? nodeMap.get(connectSource) : null;
    const whenOptions = useMemo<WorkflowEdgeCondition[]>(
      () => (sourceNode?.type === "condition" ? ["true", "false"] : ["always"]),
      [sourceNode?.type]
    );

    const effectiveConnectWhen = whenOptions.includes(connectWhen)
      ? connectWhen
      : whenOptions[0];

    const updateViewportState = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      setViewportState((previous) => {
        const next = {
          left: viewport.scrollLeft,
          top: viewport.scrollTop,
          width: viewport.clientWidth,
          height: viewport.clientHeight,
        };

        if (
          previous.left === next.left &&
          previous.top === next.top &&
          previous.width === next.width &&
          previous.height === next.height
        ) {
          return previous;
        }

        return next;
      });
    }, []);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      let frame: number | null = null;
      const requestUpdate = () => {
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
        }

        frame = window.requestAnimationFrame(() => {
          updateViewportState();
        });
      };

      updateViewportState();
      viewport.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate);

      return () => {
        viewport.removeEventListener("scroll", requestUpdate);
        window.removeEventListener("resize", requestUpdate);

        if (frame !== null) {
          window.cancelAnimationFrame(frame);
        }
      };
    }, [updateViewportState]);

    const shouldVirtualize = graph.nodes.length >= VIRTUALIZATION_THRESHOLD;

    const visibleBounds = useMemo(() => {
      if (!shouldVirtualize || viewportState.width === 0 || viewportState.height === 0) {
        return null;
      }

      const left = viewportState.left / zoom - VIRTUALIZATION_BUFFER;
      const top = viewportState.top / zoom - VIRTUALIZATION_BUFFER;
      const right = (viewportState.left + viewportState.width) / zoom + VIRTUALIZATION_BUFFER;
      const bottom =
        (viewportState.top + viewportState.height) / zoom + VIRTUALIZATION_BUFFER;

      return {
        left,
        top,
        right,
        bottom,
      };
    }, [shouldVirtualize, viewportState, zoom]);

    const visibleNodes = useMemo(() => {
      if (!shouldVirtualize || !visibleBounds) {
        return graph.nodes;
      }

      return graph.nodes.filter((node) => {
        const nodeLeft = node.position.x;
        const nodeTop = node.position.y;
        const nodeRight = node.position.x + NODE_WIDTH;
        const nodeBottom = node.position.y + NODE_HEIGHT;

        return (
          nodeRight >= visibleBounds.left &&
          nodeLeft <= visibleBounds.right &&
          nodeBottom >= visibleBounds.top &&
          nodeTop <= visibleBounds.bottom
        );
      });
    }, [graph.nodes, shouldVirtualize, visibleBounds]);

    const visibleNodeIds = useMemo(
      () => new Set(visibleNodes.map((node) => node.id)),
      [visibleNodes]
    );

    const visibleEdges = useMemo(() => {
      if (!shouldVirtualize) {
        return graph.edges;
      }

      return graph.edges.filter(
        (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      );
    }, [graph.edges, shouldVirtualize, visibleNodeIds]);

    const renderedEdges = useMemo(() => {
      return visibleEdges
        .map((edge) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);

          if (!source || !target) {
            return null;
          }

          const x1 = source.position.x + NODE_WIDTH / 2;
          const y1 = source.position.y + NODE_HEIGHT / 2;
          const x2 = target.position.x + NODE_WIDTH / 2;
          const y2 = target.position.y + NODE_HEIGHT / 2;

          return {
            edge,
            x1,
            y1,
            x2,
            y2,
            midX: (x1 + x2) / 2,
            midY: (y1 + y2) / 2,
          };
        })
        .filter((value): value is RenderedEdge => Boolean(value));
    }, [visibleEdges, nodeMap]);

    const listedEdges = useMemo(() => {
      if (graph.edges.length <= MAX_EDGE_LIST_ITEMS) {
        return graph.edges;
      }

      return graph.edges.slice(0, MAX_EDGE_LIST_ITEMS);
    }, [graph.edges]);

    const hiddenNodeCount = graph.nodes.length - visibleNodes.length;
    const hiddenEdgeListCount = graph.edges.length - listedEdges.length;

    const centerCanvas = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      viewport.scrollTo({
        left: Math.max(0, (CANVAS_WIDTH * zoom - viewport.clientWidth) / 2),
        top: Math.max(0, (CANVAS_HEIGHT * zoom - viewport.clientHeight) / 2),
      });

      updateViewportState();
    }, [updateViewportState, zoom]);

    const fitView = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      if (graph.nodes.length === 0) {
        setZoom(1);
        viewport.scrollTo({ left: 0, top: 0 });
        updateViewportState();
        return;
      }

      const minX = Math.min(...graph.nodes.map((node) => node.position.x));
      const minY = Math.min(...graph.nodes.map((node) => node.position.y));
      const maxX = Math.max(...graph.nodes.map((node) => node.position.x + NODE_WIDTH));
      const maxY = Math.max(...graph.nodes.map((node) => node.position.y + NODE_HEIGHT));

      const contentWidth = Math.max(1, maxX - minX);
      const contentHeight = Math.max(1, maxY - minY);
      const padding = 40;

      const availableWidth = Math.max(1, viewport.clientWidth - padding * 2);
      const availableHeight = Math.max(1, viewport.clientHeight - padding * 2);
      const nextZoom = clampZoom(
        Math.min(availableWidth / contentWidth, availableHeight / contentHeight)
      );

      setZoom(nextZoom);

      requestAnimationFrame(() => {
        const targetLeft = ((minX + maxX) / 2) * nextZoom - viewport.clientWidth / 2;
        const targetTop = ((minY + maxY) / 2) * nextZoom - viewport.clientHeight / 2;

        viewport.scrollTo({
          left: Math.max(0, targetLeft),
          top: Math.max(0, targetTop),
        });

        updateViewportState();
      });
    }, [graph.nodes, updateViewportState]);

    const zoomIn = useCallback(() => {
      setZoom((previous) => clampZoom(previous + ZOOM_STEP));
    }, []);

    const zoomOut = useCallback(() => {
      setZoom((previous) => clampZoom(previous - ZOOM_STEP));
    }, []);

    const handleDrop = useCallback(
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragActive(false);

        const rawType = event.dataTransfer.getData(WORKFLOW_NODE_DRAG_MIME);
        if (!rawType) {
          return;
        }

        const droppedType = rawType as WorkflowNodeType;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) {
          return;
        }

        onDropNodeType(droppedType, {
          x: clampPosition((event.clientX - rect.left) / zoom - NODE_WIDTH / 2, CANVAS_WIDTH - 20),
          y: clampPosition(
            (event.clientY - rect.top) / zoom - NODE_HEIGHT / 2,
            CANVAS_HEIGHT - 20
          ),
        });
      },
      [onDropNodeType, zoom]
    );

    const handleCreateEdge = useCallback(() => {
      if (!connectSource || !connectTarget) {
        setConnectError("Select both source and target nodes.");
        return;
      }

      if (connectSource === connectTarget) {
        setConnectError("A node cannot connect to itself.");
        return;
      }

      const normalizedWhen =
        sourceNode?.type === "condition" ? effectiveConnectWhen : "always";

      const duplicate = graph.edges.some(
        (edge) =>
          edge.source === connectSource &&
          edge.target === connectTarget &&
          edge.when === normalizedWhen
      );

      if (duplicate) {
        setConnectError("That edge already exists.");
        return;
      }

      const error = onCreateEdge({
        source: connectSource,
        target: connectTarget,
        when: normalizedWhen,
      });

      if (error) {
        setConnectError(error);
        return;
      }

      setConnectError(null);
    }, [
      connectSource,
      connectTarget,
      effectiveConnectWhen,
      graph.edges,
      onCreateEdge,
      sourceNode?.type,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        fitView,
        centerCanvas,
        zoomIn,
        zoomOut,
      }),
      [centerCanvas, fitView, zoomIn, zoomOut]
    );

    const handleSelectNode = useCallback(
      (nodeId: string) => {
        onSelectNode(nodeId);
      },
      [onSelectNode]
    );

    return (
      <section className="rounded-2xl border border-border bg-bg-card/70">
        <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 py-3">
          <div className="min-w-[170px] flex-1">
            <label
              htmlFor="workflow-connect-source"
              className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
            >
              Source
            </label>
            <select
              id="workflow-connect-source"
              value={connectSource}
              onChange={(event) => {
                setConnectSource(event.target.value);
                setConnectError(null);
              }}
              className={`w-full rounded-lg border border-border bg-bg-dark px-2.5 py-2 text-sm text-text-primary ${FOCUS_RING_CLASS}`}
            >
              <option value="">Select node</option>
              {nodeSelectOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[170px] flex-1">
            <label
              htmlFor="workflow-connect-target"
              className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
            >
              Target
            </label>
            <select
              id="workflow-connect-target"
              value={connectTarget}
              onChange={(event) => {
                setConnectTarget(event.target.value);
                setConnectError(null);
              }}
              className={`w-full rounded-lg border border-border bg-bg-dark px-2.5 py-2 text-sm text-text-primary ${FOCUS_RING_CLASS}`}
            >
              <option value="">Select node</option>
              {nodeSelectOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[125px]">
            <label
              htmlFor="workflow-connect-branch"
              className="mb-1 block text-[11px] uppercase tracking-wide text-text-dim"
            >
              Branch
            </label>
            <select
              id="workflow-connect-branch"
              value={effectiveConnectWhen}
              onChange={(event) => {
                setConnectWhen(event.target.value as WorkflowEdgeCondition);
                setConnectError(null);
              }}
              className={`w-full rounded-lg border border-border bg-bg-dark px-2.5 py-2 text-sm text-text-primary ${FOCUS_RING_CLASS}`}
              disabled={!connectSource}
            >
              {whenOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCreateEdge}
            disabled={graph.nodes.length < 2}
            className={`inline-flex min-h-11 items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
          >
            <Link2 className="h-4 w-4" />
            Connect
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={zoomOut}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={fitView}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary ${FOCUS_RING_CLASS}`}
              title="Fit all nodes in view"
            >
              <Target className="h-4 w-4" />
              Fit
            </button>
            <span className="ml-1 text-xs text-text-dim">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {connectError && (
          <p
            className="border-b border-border bg-red-400/10 px-4 py-2 text-xs text-red-200"
            role="alert"
            aria-live="assertive"
          >
            {connectError}
          </p>
        )}

        <div
          ref={viewportRef}
          className="relative overflow-auto"
          onClick={() => onSelectNode(null)}
          tabIndex={0}
          role="region"
          aria-label="Workflow canvas"
          aria-describedby="workflow-canvas-keyboard-help"
        >
          <p id="workflow-canvas-keyboard-help" className="sr-only">
            Use tab to focus nodes. Press enter to select a node. Use arrow keys to move the
            selected node and shift plus arrow for larger moves.
          </p>

          {shouldVirtualize && hiddenNodeCount > 0 && (
            <div className="pointer-events-none sticky right-3 top-3 z-10 ml-auto w-fit rounded-md border border-border bg-bg-deep/85 px-2 py-1 text-[11px] text-text-dim">
              Rendering {visibleNodes.length} / {graph.nodes.length} nodes
            </div>
          )}

          <div className="relative" style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom }}>
            <div
              ref={canvasRef}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`relative transition-colors ${dragActive ? "bg-accent-dim/40" : "bg-bg-dark/50"}`}
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              <EdgeLayer renderedEdges={renderedEdges} />

              {graph.nodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-xl border border-dashed border-border px-5 py-4 text-center">
                    <p className="text-sm font-medium text-text-secondary">
                      Drag a node onto canvas to start building.
                    </p>
                    <p className="mt-1 text-xs text-text-dim">
                      Start with one trigger and at least one end node.
                    </p>
                  </div>
                </div>
              ) : (
                <NodeLayer
                  nodes={visibleNodes}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={handleSelectNode}
                />
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              Edges ({graph.edges.length})
            </h5>
            <p className="text-xs text-text-dim">Select source/target above to add.</p>
          </div>

          {graph.edges.length === 0 ? (
            <p className="text-xs text-text-dim">No edges yet.</p>
          ) : (
            <div className="space-y-1.5">
              {listedEdges.map((edge) => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);
                return (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-bg-dark/60 px-2.5 py-1.5"
                  >
                    <p className="truncate text-xs text-text-secondary">
                      {source?.label || edge.source}
                      <ArrowRight className="mx-1 inline h-3.5 w-3.5" />
                      {target?.label || edge.target}
                      {edge.when !== "always" && (
                        <span className="ml-1 rounded bg-accent-dim px-1.5 py-0.5 text-[10px] uppercase text-accent">
                          {edge.when}
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => onDeleteEdge(edge.id)}
                      className={`min-h-11 min-w-11 rounded p-1 text-text-dim transition-colors hover:bg-white/5 hover:text-red-300 ${FOCUS_RING_CLASS}`}
                      aria-label={`Delete edge ${edge.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {hiddenEdgeListCount > 0 && (
                <p className="text-xs text-text-dim">
                  Showing first {listedEdges.length} edges. {hiddenEdgeListCount} additional edges
                  are hidden for performance.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }
);

WorkflowCanvas.displayName = "WorkflowCanvas";
