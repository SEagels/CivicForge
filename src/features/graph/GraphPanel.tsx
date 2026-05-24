import { useEffect, useMemo, useState } from "react";
import type { MaterialDraft } from "../materials/materialModel";
import { GraphCanvas } from "./GraphCanvas";
import {
  buildKnowledgeGraph,
  filterKnowledgeGraph,
  type GraphEdgeKind,
  type GraphNodeKind,
  type KnowledgeGraphNode,
} from "./graphModel";

export interface GraphPanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly onOpenMaterial: (materialId: string) => void;
}

const NODE_KIND_OPTIONS: readonly { readonly kind: GraphNodeKind; readonly label: string }[] = [
  { kind: "material", label: "素材" },
  { kind: "topic", label: "主题" },
  { kind: "tag", label: "标签" },
  { kind: "questionType", label: "题型" },
  { kind: "materialType", label: "类型" },
];

const EDGE_KIND_OPTIONS: readonly { readonly kind: GraphEdgeKind; readonly label: string }[] = [
  { kind: "material-topic", label: "主题" },
  { kind: "material-tag", label: "标签" },
  { kind: "material-question-type", label: "题型" },
  { kind: "material-type", label: "类型" },
  { kind: "material-link", label: "双链" },
];

export function GraphPanel({ materials, onOpenMaterial }: GraphPanelProps) {
  const [search, setSearch] = useState("");
  const [nodeKinds, setNodeKinds] = useState<readonly GraphNodeKind[]>(NODE_KIND_OPTIONS.map((option) => option.kind));
  const [edgeKinds, setEdgeKinds] = useState<readonly GraphEdgeKind[]>(EDGE_KIND_OPTIONS.map((option) => option.kind));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const graph = useMemo(() => buildKnowledgeGraph(materials), [materials]);
  const filteredGraph = useMemo(
    () =>
      filterKnowledgeGraph(graph, {
        search,
        nodeKinds,
        edgeKinds,
      }),
    [edgeKinds, graph, nodeKinds, search],
  );
  const selectedNode = filteredGraph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedDegree = selectedNode ? countNodeEdges(graph.edges, selectedNode.id) : 0;

  useEffect(() => {
    if (selectedNodeId && !filteredGraph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [filteredGraph.nodes, selectedNodeId]);

  const toggleNodeKind = (kind: GraphNodeKind) => {
    setNodeKinds((current) => toggleValue(current, kind, NODE_KIND_OPTIONS.map((option) => option.kind)));
  };

  const toggleEdgeKind = (kind: GraphEdgeKind) => {
    setEdgeKinds((current) => toggleValue(current, kind, EDGE_KIND_OPTIONS.map((option) => option.kind)));
  };

  return (
    <section className="graph-workspace" aria-label="知识图谱">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Knowledge Graph</p>
          <h1>把素材、主题、标签和题型连成一张可调用的申论知识网。</h1>
        </div>
        <div className="graph-summary">
          <span>节点</span>
          <strong>{filteredGraph.nodes.length}</strong>
          <span>连线 {filteredGraph.edges.length}</span>
        </div>
      </header>

      <div className="graph-layout">
        <aside className="graph-controls" aria-label="图谱筛选">
          <label className="field">
            <span>搜索节点</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="素材标题、主题或标签"
            />
          </label>

          <GraphToggleGroup
            title="节点"
            options={NODE_KIND_OPTIONS}
            enabled={nodeKinds}
            onToggle={(kind) => toggleNodeKind(kind)}
          />
          <GraphToggleGroup
            title="连线"
            options={EDGE_KIND_OPTIONS}
            enabled={edgeKinds}
            onToggle={(kind) => toggleEdgeKind(kind)}
          />
        </aside>

        <section className="graph-stage" aria-label="图谱画布">
          {filteredGraph.nodes.length > 0 ? (
            <GraphCanvas
              graph={filteredGraph}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              onSelectNode={setSelectedNodeId}
              onHoverNode={setHoveredNodeId}
            />
          ) : (
            <div className="graph-empty">
              <strong>当前筛选下没有节点</strong>
              <span>素材的主题、标签、题型和正文里的 [[素材标题]] 会自动形成图谱连接。</span>
            </div>
          )}
        </section>

        <aside className="graph-details" aria-label="节点详情">
          {selectedNode ? (
            <NodeDetails node={selectedNode} degree={selectedDegree} onOpenMaterial={onOpenMaterial} />
          ) : (
            <div className="graph-empty compact">
              <strong>选择一个节点</strong>
              <span>点击素材节点可以跳转到素材库，点击主题或标签可以查看它的连接数量。</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function GraphToggleGroup<T extends string>({
  title,
  options,
  enabled,
  onToggle,
}: {
  readonly title: string;
  readonly options: readonly { readonly kind: T; readonly label: string }[];
  readonly enabled: readonly T[];
  readonly onToggle: (kind: T) => void;
}) {
  return (
    <section className="graph-toggle-section">
      <h2>{title}</h2>
      <div className="graph-toggles">
        {options.map((option) => (
          <button
            key={option.kind}
            type="button"
            className={enabled.includes(option.kind) ? "graph-toggle active" : "graph-toggle"}
            onClick={() => onToggle(option.kind)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function NodeDetails({
  node,
  degree,
  onOpenMaterial,
}: {
  readonly node: KnowledgeGraphNode;
  readonly degree: number;
  readonly onOpenMaterial: (materialId: string) => void;
}) {
  return (
    <>
      <div>
        <p className="eyebrow">{getKindLabel(node.kind)}</p>
        <h2>{node.label}</h2>
      </div>
      <div className="graph-detail-metrics">
        <div>
          <span>连接</span>
          <strong>{degree}</strong>
        </div>
        <div>
          <span>类型</span>
          <strong>{getKindLabel(node.kind)}</strong>
        </div>
      </div>
      {node.kind === "material" && node.materialId ? (
        <button type="button" className="primary-button" onClick={() => onOpenMaterial(node.materialId!)}>
          打开素材
        </button>
      ) : null}
    </>
  );
}

function toggleValue<T extends string>(current: readonly T[], value: T, fallback: readonly T[]): readonly T[] {
  if (current.includes(value)) {
    const next = current.filter((item) => item !== value);
    return next.length > 0 ? next : fallback;
  }

  return [...current, value];
}

function countNodeEdges(edges: readonly { readonly source: string; readonly target: string }[], nodeId: string): number {
  return edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).length;
}

function getKindLabel(kind: GraphNodeKind): string {
  const option = NODE_KIND_OPTIONS.find((item) => item.kind === kind);
  return option?.label ?? kind;
}
