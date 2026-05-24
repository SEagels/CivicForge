import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from "d3-force";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { KnowledgeGraph, KnowledgeGraphEdge, KnowledgeGraphNode } from "./graphModel";

interface GraphCanvasProps {
  readonly graph: KnowledgeGraph;
  readonly selectedNodeId: string | null;
  readonly hoveredNodeId: string | null;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onHoverNode: (nodeId: string | null) => void;
}

interface PositionedNode extends KnowledgeGraphNode, SimulationNodeDatum {
  readonly id: string;
  x: number;
  y: number;
}

const CANVAS_WIDTH = 620;
const CANVAS_HEIGHT = 620;

export function GraphCanvas({
  graph,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [manualPositions, setManualPositions] = useState<Record<string, { readonly x: number; readonly y: number }>>({});
  const layout = useMemo(() => buildLayout(graph, manualPositions), [graph, manualPositions]);
  const activeNodeId = hoveredNodeId ?? selectedNodeId;
  const neighborIds = useMemo(() => getNeighborIds(graph.edges, activeNodeId), [activeNodeId, graph.edges]);

  const startDrag = (event: PointerEvent<SVGCircleElement>, nodeId: string) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedNodeId(nodeId);
    onSelectNode(nodeId);
  };

  const moveDrag = (event: PointerEvent<SVGCircleElement>) => {
    if (!draggedNodeId) {
      return;
    }

    const point = getSvgPoint(svgRef.current, event);

    if (!point) {
      return;
    }

    setManualPositions((current) => ({
      ...current,
      [draggedNodeId]: point,
    }));
  };

  const stopDrag = () => {
    setDraggedNodeId(null);
  };

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      role="img"
      aria-label="CivicForge knowledge graph"
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    >
      <g className="graph-links">
        {layout.edges.map((edge) => (
          <line
            key={edge.id}
            className={getEdgeClassName(edge, activeNodeId)}
            x1={edge.source.x}
            y1={edge.source.y}
            x2={edge.target.x}
            y2={edge.target.y}
          />
        ))}
      </g>
      <g className="graph-nodes">
        {layout.nodes.map((node) => {
          const dimmed = Boolean(activeNodeId && node.id !== activeNodeId && !neighborIds.has(node.id));
          const showLabel = node.kind === "material" || node.id === activeNodeId || neighborIds.has(node.id);

          return (
            <g
              key={node.id}
              className={dimmed ? "graph-node dimmed" : "graph-node"}
              transform={`translate(${node.x} ${node.y})`}
              onPointerEnter={() => onHoverNode(node.id)}
              onPointerLeave={() => onHoverNode(null)}
            >
              <circle
                className={`graph-node-dot ${node.kind}`}
                r={getNodeRadius(node.kind)}
                tabIndex={0}
                onClick={() => onSelectNode(node.id)}
                onPointerDown={(event) => startDrag(event, node.id)}
                onPointerMove={moveDrag}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
              >
                <title>{node.label}</title>
              </circle>
              {showLabel ? (
                <text className="graph-node-label" x={getNodeRadius(node.kind) + 7} y="4">
                  {node.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function buildLayout(graph: KnowledgeGraph, manualPositions: Record<string, { readonly x: number; readonly y: number }>) {
  const nodes: PositionedNode[] = graph.nodes.map((node, index) => {
    const angle = (index / Math.max(graph.nodes.length, 1)) * Math.PI * 2;
    const radius = 184 + (index % 4) * 24;
    const manual = manualPositions[node.id];

    return {
      ...node,
      x: manual?.x ?? CANVAS_WIDTH / 2 + Math.cos(angle) * radius,
      y: manual?.y ?? CANVAS_HEIGHT / 2 + Math.sin(angle) * radius,
      fx: manual?.x,
      fy: manual?.y,
    };
  });
  const links = graph.edges.map((edge) => ({ ...edge }));

  forceSimulation(nodes)
    .force(
      "link",
      forceLink<PositionedNode, KnowledgeGraphEdge & { source: string | PositionedNode; target: string | PositionedNode }>(
        links,
      )
        .id((node) => node.id)
        .distance((edge) => (edge.kind === "material-link" ? 122 : 96))
        .strength(0.55),
    )
    .force("charge", forceManyBody().strength(-260))
    .force("collide", forceCollide<PositionedNode>().radius((node) => getNodeRadius(node.kind) + 18))
    .force("center", forceCenter(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2))
    .stop()
    .tick(160);

  for (const node of nodes) {
    node.x = Math.max(36, Math.min(CANVAS_WIDTH - 130, node.x));
    node.y = Math.max(36, Math.min(CANVAS_HEIGHT - 36, node.y));
  }

  return {
    nodes,
    edges: links.map((edge) => ({
      ...edge,
      source: resolveNode(edge.source, nodes),
      target: resolveNode(edge.target, nodes),
    })),
  };
}

function resolveNode(value: string | PositionedNode, nodes: readonly PositionedNode[]): PositionedNode {
  if (typeof value !== "string") {
    return value;
  }

  return nodes.find((node) => node.id === value) ?? nodes[0];
}

function getNeighborIds(edges: readonly KnowledgeGraphEdge[], activeNodeId: string | null): Set<string> {
  const ids = new Set<string>();

  if (!activeNodeId) {
    return ids;
  }

  for (const edge of edges) {
    if (edge.source === activeNodeId) {
      ids.add(edge.target);
    }

    if (edge.target === activeNodeId) {
      ids.add(edge.source);
    }
  }

  return ids;
}

function getEdgeClassName(edge: { readonly source: PositionedNode; readonly target: PositionedNode; readonly kind: string }, activeNodeId: string | null): string {
  const active = activeNodeId && (edge.source.id === activeNodeId || edge.target.id === activeNodeId);
  return active ? `graph-link ${edge.kind} active` : `graph-link ${edge.kind}`;
}

function getNodeRadius(kind: KnowledgeGraphNode["kind"]): number {
  if (kind === "material") {
    return 13;
  }

  if (kind === "topic") {
    return 11;
  }

  return 8;
}

function getSvgPoint(svg: SVGSVGElement | null, event: PointerEvent<SVGCircleElement>): { readonly x: number; readonly y: number } | null {
  if (!svg) {
    return null;
  }

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return null;
  }

  const transformed = point.matrixTransform(matrix.inverse());
  return {
    x: Math.max(24, Math.min(CANVAS_WIDTH - 24, transformed.x)),
    y: Math.max(24, Math.min(CANVAS_HEIGHT - 24, transformed.y)),
  };
}
