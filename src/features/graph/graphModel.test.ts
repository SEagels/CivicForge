import { describe, expect, it } from "vitest";
import type { MaterialTypeId } from "../../domain/enums";
import type { MaterialDraft } from "../materials/materialModel";
import { createDefaultReviewSchedule } from "../review/reviewScheduler";
import {
  buildKnowledgeGraph,
  extractMaterialLinks,
  filterKnowledgeGraph,
  type GraphEdgeKind,
} from "./graphModel";

describe("knowledge graph model", () => {
  it("builds material metadata nodes and edges", () => {
    const graph = buildKnowledgeGraph([
      material({
        id: "mat-governance",
        title: "Governance Grid",
        materialType: "standard-expression",
        topicSlug: "grassroots-governance",
        tagNames: ["grid", "service"],
        questionTypeSlugs: ["essay", "implementation"],
      }),
    ]);

    expect(graph.nodes.map((node) => node.id)).toEqual([
      "material:mat-governance",
      "topic:grassroots-governance",
      "material-type:standard-expression",
      "tag:grid",
      "tag:service",
      "question-type:essay",
      "question-type:implementation",
    ]);
    expect(edgeIds(graph.edges)).toEqual([
      "material:mat-governance->topic:grassroots-governance:material-topic",
      "material:mat-governance->material-type:standard-expression:material-type",
      "material:mat-governance->tag:grid:material-tag",
      "material:mat-governance->tag:service:material-tag",
      "material:mat-governance->question-type:essay:material-question-type",
      "material:mat-governance->question-type:implementation:material-question-type",
    ]);
  });

  it("creates material links from exact wiki title matches without duplicating edges", () => {
    const graph = buildKnowledgeGraph([
      material({
        id: "mat-governance",
        title: "Governance Grid",
        contentMd: "Compare with [[Rural Case]], [[ Missing Case ]], and [[Rural Case]].",
      }),
      material({
        id: "mat-rural",
        title: "Rural Case",
      }),
    ]);

    expect(extractMaterialLinks("Use [[Rural Case]] and [[ Missing Case ]].")).toEqual([
      "Rural Case",
      "Missing Case",
    ]);
    expect(edgeIds(graph.edges).filter((id) => id.endsWith(":material-link"))).toEqual([
      "material:mat-governance->material:mat-rural:material-link",
    ]);
  });

  it("ignores archived materials when constructing the graph", () => {
    const graph = buildKnowledgeGraph([
      material({ id: "mat-active", title: "Active Material" }),
      material({ id: "mat-archived", title: "Archived Material", status: "archived" }),
    ]);

    expect(graph.nodes.some((node) => node.id === "material:mat-active")).toBe(true);
    expect(graph.nodes.some((node) => node.id === "material:mat-archived")).toBe(false);
  });

  it("filters by search, node kinds, and edge kinds while keeping valid edges only", () => {
    const graph = buildKnowledgeGraph([
      material({
        id: "mat-governance",
        title: "Governance Grid",
        topicSlug: "grassroots-governance",
        tagNames: ["grid"],
        questionTypeSlugs: ["essay"],
      }),
      material({
        id: "mat-rural",
        title: "Rural Case",
        topicSlug: "rural-revitalization",
        tagNames: ["industry"],
        questionTypeSlugs: ["analysis"],
      }),
    ]);

    const materialSearch = filterKnowledgeGraph(graph, {
      search: "rural",
      nodeKinds: ["material"],
      edgeKinds: allEdgeKinds,
    });

    expect(materialSearch.nodes.map((node) => node.id)).toEqual(["material:mat-rural"]);
    expect(materialSearch.edges).toEqual([]);

    const topicView = filterKnowledgeGraph(graph, {
      search: "",
      nodeKinds: ["material", "topic"],
      edgeKinds: ["material-topic"],
    });

    expect(topicView.nodes.map((node) => node.kind)).toEqual(["material", "topic", "material", "topic"]);
    expect(topicView.edges.every((edge) => edge.kind === "material-topic")).toBe(true);
  });
});

const allEdgeKinds: readonly GraphEdgeKind[] = [
  "material-topic",
  "material-tag",
  "material-question-type",
  "material-type",
  "material-link",
];

function material(patch: Partial<MaterialDraft> & { readonly id: string; readonly title: string }): MaterialDraft {
  return {
    id: patch.id,
    title: patch.title,
    contentMd: patch.contentMd ?? "",
    excerpt: patch.excerpt ?? "",
    materialType: (patch.materialType ?? "case") as MaterialTypeId,
    topicSlug: patch.topicSlug ?? "grassroots-governance",
    tagNames: patch.tagNames ?? [],
    questionTypeSlugs: patch.questionTypeSlugs ?? ["general"],
    source: patch.source ?? "",
    status: patch.status ?? "active",
    favorite: patch.favorite ?? false,
    reviewEnabled: patch.reviewEnabled ?? true,
    ...createDefaultReviewSchedule(),
    updatedAt: patch.updatedAt ?? "2026-05-24T00:00:00.000Z",
  };
}

function edgeIds(edges: readonly { readonly source: string; readonly target: string; readonly kind: string }[]): string[] {
  return edges.map((edge) => `${edge.source}->${edge.target}:${edge.kind}`);
}
