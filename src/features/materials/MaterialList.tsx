import type { MaterialTypeId } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialFilters } from "./materialFilters";
import type { MaterialDraft } from "./materialModel";

interface MaterialListProps {
  readonly materials: readonly MaterialDraft[];
  readonly selectedId: string | null;
  readonly filters: MaterialFilters;
  readonly totalCount: number;
  readonly tags: readonly string[];
  readonly hasActiveFilters: boolean;
  readonly onSelect: (id: string) => void;
  readonly onCreate: () => void;
  readonly onFiltersChange: (patch: Partial<MaterialFilters>) => void;
  readonly onClearFilters: () => void;
}

const typeNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_MATERIAL_TYPES.map((type) => [type.slug, type.name]));
const topicNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));

export function MaterialList({
  materials,
  selectedId,
  filters,
  totalCount,
  tags,
  hasActiveFilters,
  onSelect,
  onCreate,
  onFiltersChange,
  onClearFilters,
}: MaterialListProps) {
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

        <div className="filter-toggles">
          <label>
            <input
              type="checkbox"
              checked={filters.favoriteOnly}
              onChange={(event) => onFiltersChange({ favoriteOnly: event.target.checked })}
            />
            <span>收藏</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.reviewOnly}
              onChange={(event) => onFiltersChange({ reviewOnly: event.target.checked })}
            />
            <span>待复习池</span>
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
      </div>

      <div className="material-items">
        {materials.length === 0 ? (
          <div className="empty-list">
            <strong>没有匹配素材</strong>
            <span>换个关键词，或清空筛选后再试。</span>
          </div>
        ) : (
          materials.map((material) => (
            <button
              type="button"
              key={material.id}
              className={material.id === selectedId ? "material-card active" : "material-card"}
              onClick={() => onSelect(material.id)}
            >
              <span className="material-title">{material.title}</span>
              <span className="material-meta">
                {topicNameBySlug.get(material.topicSlug)} / {typeNameBySlug.get(material.materialType)}
              </span>
              <span className="material-excerpt">{material.excerpt || material.contentMd || "空白素材"}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
