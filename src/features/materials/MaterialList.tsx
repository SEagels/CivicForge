import type { MaterialDraft } from "./materialModel";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";

interface MaterialListProps {
  readonly materials: readonly MaterialDraft[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onCreate: () => void;
}

const typeNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_MATERIAL_TYPES.map((type) => [type.slug, type.name]));
const topicNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));

export function MaterialList({ materials, selectedId, onSelect, onCreate }: MaterialListProps) {
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
        <input type="search" placeholder="搜索标题、主题、表达..." aria-label="搜索素材" />
      </div>

      <div className="material-items">
        {materials.map((material) => (
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
        ))}
      </div>
    </section>
  );
}
