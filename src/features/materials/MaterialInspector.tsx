import type { MaterialTypeId } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft, MaterialPatch } from "./materialModel";

interface MaterialInspectorProps {
  readonly material: MaterialDraft | null;
  readonly onChange: (patch: MaterialPatch) => void;
  readonly onArchive: () => void;
}

export function MaterialInspector({ material, onChange, onArchive }: MaterialInspectorProps) {
  if (!material) {
    return (
      <aside className="inspector" aria-label="属性面板">
        <h2>属性</h2>
        <p className="muted">暂无选中素材。</p>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="属性面板">
      <div className="pane-header compact">
        <div>
          <p className="eyebrow">Properties</p>
          <h2>属性</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onArchive}>
          归档
        </button>
      </div>

      <label className="field">
        <span>主题</span>
        <select value={material.topicSlug} onChange={(event) => onChange({ topicSlug: event.target.value })}>
          {BUILTIN_TOPICS.map((topic) => (
            <option key={topic.slug} value={topic.slug}>
              {topic.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>素材类型</span>
        <select
          value={material.materialType}
          onChange={(event) => onChange({ materialType: event.target.value as MaterialTypeId })}
        >
          {BUILTIN_MATERIAL_TYPES.map((type) => (
            <option key={type.slug} value={type.slug}>
              {type.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="field-group">
        <legend>适用题型</legend>
        {BUILTIN_QUESTION_TYPES.map((type) => {
          const checked = material.questionTypeSlugs.includes(type.slug);
          return (
            <label key={type.slug} className="check-row">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange({ questionTypeSlugs: toggleValue(material.questionTypeSlugs, type.slug) })}
              />
              <span>{type.name}</span>
            </label>
          );
        })}
      </fieldset>

      <label className="field">
        <span>标签</span>
        <input
          value={material.tagNames.join(", ")}
          onChange={(event) =>
            onChange({
              tagNames: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
          placeholder="网格化, 规范表达"
        />
      </label>

      <label className="field">
        <span>来源</span>
        <input value={material.source} onChange={(event) => onChange({ source: event.target.value })} />
      </label>

      <label className="switch-row">
        <input
          type="checkbox"
          checked={material.reviewEnabled}
          onChange={(event) => onChange({ reviewEnabled: event.target.checked })}
        />
        <span>加入复习</span>
      </label>

      <div className="inspector-note">
        <span>更新时间</span>
        <strong>{new Date(material.updatedAt).toLocaleString("zh-CN")}</strong>
      </div>
    </aside>
  );
}

function toggleValue(values: readonly string[], value: string): readonly string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
