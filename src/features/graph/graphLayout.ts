import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from "d3-force";
import type { KnowledgeGraph, KnowledgeGraphEdge, KnowledgeGraphNode } from "./graphModel";

export interface PositionedGraphNode extends KnowledgeGraphNode, SimulationNodeDatum {
  readonly id: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

export interface PositionedGraphEdge extends Omit<KnowledgeGraphEdge, "source" | "target"> {
  readonly source: PositionedGraphNode;
  readonly target: PositionedGraphNode;
}

export interface GraphLayout {
  readonly nodes: readonly PositionedGraphNode[];
  readonly edges: readonly PositionedGraphEdge[];
}

export const GRAPH_LAYOUT_CONFIG = {
  width: 620,
  height: 620,
  minNodeDistance: 44,
  relaxationTicks: 260,
  overlapRelaxationIterations: 90,
} as const;

export function buildGraphLayout(
  graph: KnowledgeGraph,
  manualPositions: Record<string, { readonly x: number; readonly y: number }>,
): GraphLayout {
  const nodes = createInitialNodes(graph.nodes, manualPositions);
  const links = graph.edges.map((edge) => ({ ...edge }));

  forceSimulation(nodes)
    .force(
      "link",
      forceLink<PositionedGraphNode, KnowledgeGraphEdge & { source: string | PositionedGraphNode; target: string | PositionedGraphNode }>(
        links,
      )
        .id((node) => node.id)
        .distance((edge) => (edge.kind === "material-link" ? 156 : 124))
        .strength(0.48),
    )
    .force("charge", forceManyBody().strength(-520))
    .force("collide", forceCollide<PositionedGraphNode>().radius((node) => getNodeHitRadius(node.kind) + 6))
    .force("center", forceCenter(GRAPH_LAYOUT_CONFIG.width / 2, GRAPH_LAYOUT_CONFIG.height / 2))
    .stop()
    .tick(GRAPH_LAYOUT_CONFIG.relaxationTicks);

  clampNodes(nodes);
  relaxOverlaps(nodes);
  clampNodes(nodes);

  return {
    nodes,
    edges: links.map((edge) => ({
      ...edge,
      source: resolveNode(edge.source, nodes),
      target: resolveNode(edge.target, nodes),
    })),
  };
}

export function getNodeRadius(kind: KnowledgeGraphNode["kind"]): number {
  if (kind === "material") {
    return 13;
  }

  if (kind === "topic") {
    return 11;
  }

  return 8;
}

export function getNodeHitRadius(kind: KnowledgeGraphNode["kind"]): number {
  if (kind === "material") {
    return 22;
  }

  if (kind === "topic") {
    return 20;
  }

  return 18;
}

function createInitialNodes(
  nodes: readonly KnowledgeGraphNode[],
  manualPositions: Record<string, { readonly x: number; readonly y: number }>,
): PositionedGraphNode[] {
  return nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius = 194 + (index % 5) * 28;
    const manual = manualPositions[node.id];

    return {
      ...node,
      x: manual?.x ?? GRAPH_LAYOUT_CONFIG.width / 2 + Math.cos(angle) * radius,
      y: manual?.y ?? GRAPH_LAYOUT_CONFIG.height / 2 + Math.sin(angle) * radius,
      fx: manual?.x,
      fy: manual?.y,
    };
  });
}

function resolveNode(value: string | PositionedGraphNode, nodes: readonly PositionedGraphNode[]): PositionedGraphNode {
  if (typeof value !== "string") {
    return value;
  }

  return nodes.find((node) => node.id === value) ?? nodes[0];
}

function relaxOverlaps(nodes: PositionedGraphNode[]) {
  for (let iteration = 0; iteration < GRAPH_LAYOUT_CONFIG.overlapRelaxationIterations; iteration += 1) {
    let moved = false;

    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
        const left = nodes[leftIndex];
        const right = nodes[rightIndex];
        const minDistance = Math.max(
          GRAPH_LAYOUT_CONFIG.minNodeDistance,
          getNodeHitRadius(left.kind) + getNodeHitRadius(right.kind),
        );
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const distance = Math.hypot(dx, dy);

        if (distance >= minDistance) {
          continue;
        }

        const direction = getSeparationDirection(leftIndex, rightIndex, dx, dy, distance);
        const overlap = minDistance - Math.max(distance, 0.001);
        const leftFixed = left.fx != null || left.fy != null;
        const rightFixed = right.fx != null || right.fy != null;
        const leftShare = leftFixed ? 0 : rightFixed ? 1 : 0.5;
        const rightShare = rightFixed ? 0 : leftFixed ? 1 : 0.5;

        left.x -= direction.x * overlap * leftShare;
        left.y -= direction.y * overlap * leftShare;
        right.x += direction.x * overlap * rightShare;
        right.y += direction.y * overlap * rightShare;
        moved = true;
      }
    }

    clampNodes(nodes);

    if (!moved) {
      return;
    }
  }
}

function getSeparationDirection(
  leftIndex: number,
  rightIndex: number,
  dx: number,
  dy: number,
  distance: number,
): { readonly x: number; readonly y: number } {
  if (distance > 0.001) {
    return {
      x: dx / distance,
      y: dy / distance,
    };
  }

  const angle = ((leftIndex * 37 + rightIndex * 17) % 360) * (Math.PI / 180);

  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function clampNodes(nodes: PositionedGraphNode[]) {
  for (const node of nodes) {
    const radius = getNodeHitRadius(node.kind);

    node.x = Math.max(radius, Math.min(GRAPH_LAYOUT_CONFIG.width - radius, node.x));
    node.y = Math.max(radius, Math.min(GRAPH_LAYOUT_CONFIG.height - radius, node.y));
  }
}
