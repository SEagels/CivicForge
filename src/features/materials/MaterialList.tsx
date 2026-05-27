import type { MaterialTypeId } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialFilters, MaterialWorkbenchFilterStep } from "./materialFilters";
import type { MaterialDraft } from "./materialModel";
import {
  getMaterialWorkbenchStatus,
  type MaterialWorkbenchStats,
  type MaterialWorkbenchStatus,
} from "./materialWorkbench";

interface MaterialListProps {
  readonly materials: readonly MaterialDraft[];
  readonly selectedId: string | null;
  readonly filters: MaterialFilters;
  readonly totalCount: number;
  readonly workbenchCount: number;
  readonly workbenchStats: MaterialWorkbenchStats;
  readonly tags: readonly string[];
  readonly hasActiveFilters: boolean;
  readonly onSelect: (id: string) => void;
  readonly onCreate: () => void;
  readonly onFiltersChange: (patch: Partial<MaterialFilters>) => void;
  readonly onClearFilters: () => void;
}

type QuickFilterId = "all" | "workbench" | "review" | "favorite";

const QUICK_FILTERS: readonly {
  readonly id: QuickFilterId;
  readonly label: string;
}[] = [
  { id: "all", label: "全部" },
  { id: "workbench", label: "加工台" },
  { id: "review", label: "复习池" },
  { id: "favorite", label: "收藏" },
];

const WORKBENCH_STEPS: readonly {
  readonly id: Exclude<MaterialWorkbenchFilterStep, "all">;
  readonly label: string;
  readonly countKey: keyof Pick<
    MaterialWorkbenchStats,
    "candidateCount" | "classifyCount" | "intakeReadyCount" | "reviewReadyCount"
  >;
}[] = [
  { id: "candidate", label: "候选", countKey: "candidateCount" },
  { id: "classify", label: "待分类", countKey: "classifyCount" },
  { id: "intake", label: "待入库", countKey: "intakeReadyCount" },
  { id: "review", label: "待复习", countKey: "reviewReadyCount" },
];

const typeNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_MATERIAL_TYPES.map((type) => [type.slug, type.name]));
const topicNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));

export function MaterialList({
  materials,
  selectedId,
  filters,
  totalCount,
  workbenchCount,
  workbenchStats,
  tags,
  hasActiveFilters,
  onSelect,
  onCreate,
  onFiltersChange,
  onClearFilters,
}: MaterialListProps) {
  const activeQuickFilter = getActiveQuickFilter(filters);

  return (
    <section className="material-list" aria-label="素材列表">
      <div className="pane-header">
        <div>
          <p className="eyebrow">Library</p>
          <h2>素材库</h2>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          新建
        </button>
      </div>

      <div className="search-box">
        <input
          type="search"
          value={filters.query}
          onChange={(event) => onFiltersChange({ query: event.target.value })}
          placeholder="搜索标题、主题、表达..."
          aria-label="搜索素材"
        />
      </div>

      <div className="filter-panel" aria-label="筛选条件">
        <div className="library-quick-filters" aria-label="素材快速筛选">
          {QUICK_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeQuickFilter === item.id ? "active" : ""}
              onClick={() => onFiltersChange(getQuickFilterPatch(item.id))}
            >
              {item.label}
              {item.id === "workbench" ? <strong>{workbenchCount}</strong> : null}
            </button>
          ))}
        </div>

        <div className="filter-grid">
          <label>
            <span>主题</span>
            <select value={filters.topicSlug} onChange={(event) => onFiltersChange({ topicSlug: event.target.value })}>
              <option value="">全部主题</option>
              {BUILTIN_TOPICS.map((topic) => (
                <option key={topic.slug} value={topic.slug}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>类型</span>
            <select
              value={filters.materialType}
              onChange={(event) => onFiltersChange({ materialType: event.target.value as MaterialTypeId | "" })}
            >
              <option value="">全部类型</option>
              {BUILTIN_MATERIAL_TYPES.map((type) => (
                <option key={type.slug} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>题型</span>
            <select
              value={filters.questionTypeSlug}
              onChange={(event) => onFiltersChange({ questionTypeSlug: event.target.value })}
            >
              <option value="">全部题型</option>
              {BUILTIN_QUESTION_TYPES.map((type) => (
                <option key={type.slug} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>标签</span>
            <select value={filters.tagName} onChange={(event) => onFiltersChange({ tagName: event.target.value })}>
              <option value="">全部标签</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="result-line">
          <span>
            {materials.length} / {totalCount} 条
          </span>
          {hasActiveFilters ? (
            <button type="button" className="link-button" onClick={onClearFilters}>
              清空筛选
            </button>
          ) : null}
        </div>

        <div className="workbench-mini-stats" aria-label="加工台分步筛选">
          {WORKBENCH_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              className={filters.workbenchStep === step.id ? "workbench-step-chip active" : "workbench-step-chip"}
              onClick={() =>
                onFiltersChange({
                  favoriteOnly: false,
                  reviewOnly: false,
                  workbenchOnly: true,
                  workbenchStep: filters.workbenchStep === step.id ? "all" : step.id,
                })
              }
            >
              <span>{step.label}</span>
              <strong>{workbenchStats[step.countKey]}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="material-items">
        {materials.length === 0 ? (
          <div className="empty-list">
            <strong>没有匹配素材</strong>
            <span>换个关键词，或清空筛选后再试。</span>
          </div>
        ) : (
          materials.map((material) => {
            const workbenchStatus = getMaterialWorkbenchStatus(material);

            return (
              <button
                type="button"
                key={material.id}
                className={material.id === selectedId ? "material-card active" : "material-card"}
                onClick={() => onSelect(material.id)}
              >
                <span className="material-card-topline">
                  <span className="material-title">{material.title}</span>
                  <span className={`material-status-badge ${workbenchStatus.stage}`}>
                    {getWorkbenchStageLabel(workbenchStatus)}
                  </span>
                </span>
                <span className="material-meta">
                  {topicNameBySlug.get(material.topicSlug)} / {typeNameBySlug.get(material.materialType)}
                </span>
                <span className="material-excerpt">{material.excerpt || material.contentMd || "空白素材"}</span>
                <span className="material-card-footer">
                  <span>{material.source || "未标来源"}</span>
                  <strong>{workbenchStatus.actionLabel}</strong>
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function getActiveQuickFilter(filters: MaterialFilters): QuickFilterId {
  if (filters.workbenchOnly || filters.workbenchStep !== "all") {
    return "workbench";
  }

  if (filters.reviewOnly) {
    return "review";
  }

  if (filters.favoriteOnly) {
    return "favorite";
  }

  return "all";
}

function getQuickFilterPatch(id: QuickFilterId): Partial<MaterialFilters> {
  if (id === "workbench") {
    return {
      favoriteOnly: false,
      reviewOnly: false,
      workbenchOnly: true,
      workbenchStep: "all",
    };
  }

  if (id === "review") {
    return {
      favoriteOnly: false,
      reviewOnly: true,
      workbenchOnly: false,
      workbenchStep: "all",
    };
  }

  if (id === "favorite") {
    return {
      favoriteOnly: true,
      reviewOnly: false,
      workbenchOnly: false,
      workbenchStep: "all",
    };
  }

  return {
    favoriteOnly: false,
    reviewOnly: false,
    workbenchOnly: false,
    workbenchStep: "all",
  };
}

function getWorkbenchStageLabel(status: MaterialWorkbenchStatus): string {
  if (status.stage === "candidate") {
    return "候选";
  }

  if (status.stage === "refining") {
    return "待打磨";
  }

  if (status.primaryStep === "intake") {
    return "待入库";
  }

  if (status.stage === "ready") {
    return "可复习";
  }

  return "已入库";
}
