import type { MaterialTypeId } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft } from "../materials/materialModel";

export type GraphNodeKind = "material" | "topic" | "tag" | "questionType" | "materialType";

export type GraphEdgeKind =
  | "material-topic"
  | "material-tag"
  | "material-question-type"
  | "material-type"
  | "material-link";

export interface KnowledgeGraphNode {
  readonly id: string;
  readonly kind: GraphNodeKind;
  readonly label: string;
  readonly materialId?: string;
  readonly sourceKey?: string;
}

export interface KnowledgeGraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: GraphEdgeKind;
}

export interface KnowledgeGraph {
  readonly nodes: readonly KnowledgeGraphNode[];
  readonly edges: readonly KnowledgeGraphEdge[];
}

export interface KnowledgeGraphFilters {
  readonly search: string;
  readonly nodeKinds: readonly GraphNodeKind[];
  readonly edgeKinds: readonly GraphEdgeKind[];
}

const TOPIC_NAMES: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));
const MATERIAL_TYPE_NAMES: ReadonlyMap<string, string> = new Map(BUILTIN_MATERIAL_TYPES.map((type) => [type.id, type.name]));
const QUESTION_TYPE_NAMES: ReadonlyMap<string, string> = new Map(
  BUILTIN_QUESTION_TYPES.map((type) => [type.slug, type.name]),
);

export function buildKnowledgeGraph(materials: readonly MaterialDraft[]): KnowledgeGraph {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const activeMaterials = materials.filter((material) => material.status === "active" || material.status === "draft");
  const materialByTitle = new Map(activeMaterials.map((material) => [material.title.trim(), material]));

  const addNode = (node: KnowledgeGraphNode) => {
    if (nodeIds.has(node.id)) {
      return;
    }

    nodeIds.add(node.id);
    nodes.push(node);
  };

  const addEdge = (source: string, target: string, kind: GraphEdgeKind) => {
    const id = `${source}->${target}:${kind}`;

    if (edgeIds.has(id)) {
      return;
    }

    edgeIds.add(id);
    edges.push({ id, source, target, kind });
  };

  for (const material of activeMaterials) {
    const materialNodeId = getMaterialNodeId(material.id);
    addNode({
      id: materialNodeId,
      kind: "material",
      label: material.title,
      materialId: material.id,
      sourceKey: material.id,
    });

    const topicNodeId = getTopicNodeId(material.topicSlug);
    addNode({
      id: topicNodeId,
      kind: "topic",
      label: TOPIC_NAMES.get(material.topicSlug) ?? material.topicSlug,
      sourceKey: material.topicSlug,
    });
    addEdge(materialNodeId, topicNodeId, "material-topic");

    const materialTypeNodeId = getMaterialTypeNodeId(material.materialType);
    addNode({
      id: materialTypeNodeId,
      kind: "materialType",
      label: MATERIAL_TYPE_NAMES.get(material.materialType) ?? material.materialType,
      sourceKey: material.materialType,
    });
    addEdge(materialNodeId, materialTypeNodeId, "material-type");

    for (const tagName of material.tagNames) {
      const normalizedTag = normalizeTag(tagName);

      if (!normalizedTag) {
        continue;
      }

      const tagNodeId = getTagNodeId(normalizedTag);
      addNode({
        id: tagNodeId,
        kind: "tag",
        label: tagName.trim(),
        sourceKey: normalizedTag,
      });
      addEdge(materialNodeId, tagNodeId, "material-tag");
    }

    for (const questionTypeSlug of material.questionTypeSlugs) {
      const questionTypeNodeId = getQuestionTypeNodeId(questionTypeSlug);
      addNode({
        id: questionTypeNodeId,
        kind: "questionType",
        label: QUESTION_TYPE_NAMES.get(questionTypeSlug) ?? questionTypeSlug,
        sourceKey: questionTypeSlug,
      });
      addEdge(materialNodeId, questionTypeNodeId, "material-question-type");
    }
  }

  for (const material of activeMaterials) {
    const sourceNodeId = getMaterialNodeId(material.id);

    for (const linkedTitle of extractMaterialLinks(material.contentMd)) {
      const targetMaterial = materialByTitle.get(linkedTitle);

      if (!targetMaterial || targetMaterial.id === material.id) {
        continue;
      }

      addEdge(sourceNodeId, getMaterialNodeId(targetMaterial.id), "material-link");
    }
  }

  return { nodes, edges };
}

export function filterKnowledgeGraph(graph: KnowledgeGraph, filters: KnowledgeGraphFilters): KnowledgeGraph {
  const search = filters.search.trim().toLocaleLowerCase("zh-CN");
  const visibleKinds = new Set(filters.nodeKinds);
  const visibleEdgeKinds = new Set(filters.edgeKinds);
  const nodes = graph.nodes.filter((node) => {
    if (!visibleKinds.has(node.kind)) {
      return false;
    }

    if (!search) {
      return true;
    }

    return node.label.toLocaleLowerCase("zh-CN").includes(search);
  });
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) => visibleEdgeKinds.has(edge.kind) && visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  );

  return { nodes, edges };
}

export function extractMaterialLinks(contentMd: string): string[] {
  const links: string[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;

  for (const match of contentMd.matchAll(pattern)) {
    const title = match[1]?.trim();

    if (title) {
      links.push(title);
    }
  }

  return links;
}

function getMaterialNodeId(materialId: string): string {
  return `material:${materialId}`;
}

function getTopicNodeId(topicSlug: string): string {
  return `topic:${topicSlug}`;
}

function getTagNodeId(normalizedTag: string): string {
  return `tag:${normalizedTag}`;
}

function getQuestionTypeNodeId(questionTypeSlug: string): string {
  return `question-type:${questionTypeSlug}`;
}

function getMaterialTypeNodeId(materialType: MaterialTypeId): string {
  return `material-type:${materialType}`;
}

function normalizeTag(tagName: string): string {
  return tagName.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, "-");
}
