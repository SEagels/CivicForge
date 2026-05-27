import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import {
  buildGraphLayout,
  getNodeHitRadius,
  getNodeRadius,
  GRAPH_LAYOUT_CONFIG,
  type PositionedGraphEdge,
} from "./graphLayout";
import type { KnowledgeGraph, KnowledgeGraphEdge } from "./graphModel";
import { applyGraphPan, applyGraphZoom, type GraphViewport } from "./graphViewport";

interface GraphCanvasProps {
  readonly graph: KnowledgeGraph;
  readonly selectedNodeId: string | null;
  readonly hoveredNodeId: string | null;
  readonly viewport: GraphViewport;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onHoverNode: (nodeId: string | null) => void;
  readonly onViewportChange: (viewport: GraphViewport) => void;
}

export function GraphCanvas({
  graph,
  selectedNodeId,
  hoveredNodeId,
  viewport,
  onSelectNode,
  onHoverNode,
  onViewportChange,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [panStart, setPanStart] = useState<{ readonly x: number; readonly y: number; readonly viewport: GraphViewport } | null>(
    null,
  );
  const [manualPositions, setManualPositions] = useState<Record<string, { readonly x: number; readonly y: number }>>({});
  const layout = useMemo(() => buildGraphLayout(graph, manualPositions), [graph, manualPositions]);
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

    const point = getGraphPoint(svgRef.current, event, viewport);

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

  const zoomCanvas = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const point = getSvgPoint(svgRef.current, event);

    if (!point) {
      return;
    }

    onViewportChange(
      applyGraphZoom(viewport, {
        anchorX: point.x,
        anchorY: point.y,
        deltaY: event.deltaY,
      }),
    );
  };

  const startPan = (event: PointerEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanStart({
      x: event.clientX,
      y: event.clientY,
      viewport,
    });
  };

  const movePan = (event: PointerEvent<SVGSVGElement>) => {
    if (!panStart) {
      return;
    }

    onViewportChange(
      applyGraphPan(panStart.viewport, {
        deltaX: event.clientX - panStart.x,
        deltaY: event.clientY - panStart.y,
      }),
    );
  };

  const stopPan = () => {
    setPanStart(null);
  };

  return (
    <svg
      ref={svgRef}
      className={panStart ? "graph-canvas panning" : "graph-canvas"}
      role="img"
      aria-label="CivicForge knowledge graph"
      viewBox={`0 0 ${GRAPH_LAYOUT_CONFIG.width} ${GRAPH_LAYOUT_CONFIG.height}`}
      onWheel={zoomCanvas}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={stopPan}
      onPointerCancel={stopPan}
    >
      <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
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
                  className={`graph-node-hitbox ${node.kind}`}
                  r={getNodeHitRadius(node.kind)}
                  tabIndex={0}
                  onClick={() => onSelectNode(node.id)}
                  onPointerDown={(event) => startDrag(event, node.id)}
                  onPointerMove={moveDrag}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                >
                  <title>{node.label}</title>
                </circle>
                <circle className={`graph-node-dot ${node.kind}`} r={getNodeRadius(node.kind)} aria-hidden="true" />
                {showLabel ? (
                  <text className="graph-node-label" x={getNodeRadius(node.kind) + 7} y="4">
                    {node.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
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

function getEdgeClassName(edge: PositionedGraphEdge, activeNodeId: string | null): string {
  const active = activeNodeId && (edge.source.id === activeNodeId || edge.target.id === activeNodeId);
  return active ? `graph-link ${edge.kind} active` : `graph-link ${edge.kind}`;
}

function getGraphPoint(
  svg: SVGSVGElement | null,
  event: PointerEvent<SVGCircleElement>,
  viewport: GraphViewport,
): { readonly x: number; readonly y: number } | null {
  const point = getSvgPoint(svg, event);

  if (!point) {
    return null;
  }

  return {
    x: Math.max(24, Math.min(GRAPH_LAYOUT_CONFIG.width - 24, (point.x - viewport.x) / viewport.scale)),
    y: Math.max(24, Math.min(GRAPH_LAYOUT_CONFIG.height - 24, (point.y - viewport.y) / viewport.scale)),
  };
}

function getSvgPoint(
  svg: SVGSVGElement | null,
  event: PointerEvent<SVGCircleElement> | PointerEvent<SVGSVGElement> | WheelEvent<SVGSVGElement>,
): { readonly x: number; readonly y: number } | null {
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
  return transformed;
}
