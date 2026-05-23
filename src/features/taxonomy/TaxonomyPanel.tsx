import type { MaterialDraft } from "../materials/materialModel";
import { getMaterialTypeStats, getQuestionTypeStats, getTagStats, getTopicStats, type TaxonomyCount } from "./taxonomyStats";

export interface TaxonomyPanelProps {
  readonly materials: readonly MaterialDraft[];
}

export function TaxonomyPanel({ materials }: TaxonomyPanelProps) {
  const topics = getTopicStats(materials);
  const materialTypes = getMaterialTypeStats(materials);
  const questionTypes = getQuestionTypeStats(materials);
  const tags = getTagStats(materials);

  return (
    <section className="taxonomy-workspace" aria-label="主题标签">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Tags / Themes</p>
          <h1>按申论主题、素材类型和题型查看沉淀情况。</h1>
        </div>
      </header>

      <div className="taxonomy-layout">
        <TaxonomySection title="主题分类" items={topics} />
        <TaxonomySection title="素材类型" items={materialTypes} />
        <TaxonomySection title="适用题型" items={questionTypes} />
        <TaxonomySection title="标签" items={tags} emptyText="还没有自定义标签。" />
      </div>
    </section>
  );
}

function TaxonomySection({
  title,
  items,
  emptyText = "暂无数据。",
}: {
  readonly title: string;
  readonly items: readonly TaxonomyCount[];
  readonly emptyText?: string;
}) {
  return (
    <section className="taxonomy-section">
      <div className="panel-title-row">
        <h2>{title}</h2>
        <span>{items.reduce((sum, item) => sum + item.count, 0)}</span>
      </div>
      {items.length > 0 ? (
        <div className="taxonomy-list">
          {items.map((item) => (
            <article key={item.id} className={item.count > 0 ? "taxonomy-item active" : "taxonomy-item"}>
              <div>
                <strong>{item.name}</strong>
                {item.description ? <p>{item.description}</p> : null}
              </div>
              <span>{item.count}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-list">
          <strong>{emptyText}</strong>
          <span>给素材补充标签后，这里会自动汇总。</span>
        </div>
      )}
    </section>
  );
}
