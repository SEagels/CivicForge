import { describe, expect, it } from "vitest";
import {
  GRAPH_LAYOUT_CONFIG,
  buildGraphLayout,
  getNodeHitRadius,
  getNodeRadius,
  type PositionedGraphNode,
} from "./graphLayout";
import type { KnowledgeGraph } from "./graphModel";

describe("graph layout", () => {
  it("keeps dense nodes separated enough for pointer targets", () => {
    const layout = buildGraphLayout(makeDenseGraph(24), {});

    expect(getMinimumDistance(layout.nodes)).toBeGreaterThanOrEqual(GRAPH_LAYOUT_CONFIG.minNodeDistance - 0.5);
  });

  it("keeps nodes inside the visible canvas after overlap relaxation", () => {
    const layout = buildGraphLayout(makeDenseGraph(18), {});

    for (const node of layout.nodes) {
      const hitRadius = getNodeHitRadius(node.kind);

      expect(node.x).toBeGreaterThanOrEqual(hitRadius);
      expect(node.x).toBeLessThanOrEqual(GRAPH_LAYOUT_CONFIG.width - hitRadius);
      expect(node.y).toBeGreaterThanOrEqual(hitRadius);
      expect(node.y).toBeLessThanOrEqual(GRAPH_LAYOUT_CONFIG.height - hitRadius);
    }
  });

  it("uses a larger invisible hit target than the visual dot", () => {
    expect(getNodeHitRadius("tag")).toBeGreaterThan(getNodeRadius("tag"));
    expect(getNodeHitRadius("material")).toBeGreaterThanOrEqual(20);
  });
});

function makeDenseGraph(count: number): KnowledgeGraph {
  const nodes = Array.from({ length: count }, (_, index) => ({
    id: `material:${index}`,
    kind: "material" as const,
    label: `Material ${index}`,
    materialId: `${index}`,
  }));

  return {
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      id: `${nodes[0].id}->${node.id}:material-link`,
      source: nodes[0].id,
      target: node.id,
      kind: index % 2 === 0 ? "material-link" : "material-tag",
    })),
  };
}

function getMinimumDistance(nodes: readonly PositionedGraphNode[]): number {
  let minimum = Number.POSITIVE_INFINITY;

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const distance = Math.hypot(left.x - right.x, left.y - right.y);
      minimum = Math.min(minimum, distance);
    }
  }

  return minimum;
}
