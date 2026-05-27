import type { MaterialTypeId } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft, MaterialPatch } from "./materialModel";
import {
  getMaterialQualityReport,
  type MaterialDuplicateHint,
  type MaterialQualityLevel,
} from "./materialQuality";
import { getMaterialWorkbenchStatus } from "./materialWorkbench";

interface MaterialInspectorProps {
  readonly material: MaterialDraft | null;
  readonly duplicateHints: readonly MaterialDuplicateHint[];
  readonly onChange: (patch: MaterialPatch) => void;
  readonly onArchive: () => void;
  readonly onConfirm: () => void;
  readonly onStartReview: () => void;
  readonly onStartRewrite: () => void;
  readonly onResetExamples: () => void;
}

export function MaterialInspector({
  material,
  duplicateHints,
  onChange,
  onArchive,
  onConfirm,
  onStartReview,
  onStartRewrite,
  onResetExamples,
}: MaterialInspectorProps) {
  if (!material) {
    return (
      <aside className="inspector" aria-label="属性面板">
        <h2>属性</h2>
        <p className="muted">暂无选中素材。</p>
        <button type="button" className="reset-button" onClick={onResetExamples}>
          重置示例数据
        </button>
      </aside>
    );
  }

  const wordCount = countText(material.contentMd);
  const qualityReport = getMaterialQualityReport(material);
  const workbenchStatus = getMaterialWorkbenchStatus(material);
  const qualityLabel = getQualityLevelLabel(qualityReport.level);
  const failedQualityLabels = qualityReport.checks.filter((check) => !check.passed).map((check) => check.label);

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

      <label className="favorite-row">
        <input
          type="checkbox"
          checked={material.favorite}
          onChange={(event) => onChange({ favorite: event.target.checked })}
        />
        <span>收藏这条素材</span>
      </label>

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

      <section className={`quality-panel ${qualityReport.level}`} aria-label="素材质量">
        <div className="quality-score-row">
          <span>质量</span>
          <strong>{qualityReport.score}</strong>
          <small>{qualityLabel}</small>
        </div>
        {failedQualityLabels.length > 0 ? (
          <ul>
            {failedQualityLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : (
          <p>已达到复习入库标准</p>
        )}
      </section>

      <section className={`workbench-panel ${workbenchStatus.stage}`} aria-label="素材加工台">
        <div className="workbench-panel-header">
          <div>
            <span>加工台</span>
            <strong>{getWorkbenchStepLabel(workbenchStatus.primaryStep)}</strong>
          </div>
          <small>{workbenchStatus.actionLabel}</small>
        </div>
        {workbenchStatus.failedCheckLabels.length > 0 ? (
          <ul>
            {workbenchStatus.failedCheckLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : (
          <p>这条素材已经满足质量门槛，可以进入复习。</p>
        )}
        <div className="workbench-actions">
          {workbenchStatus.primaryStep === "intake" ? (
            <button type="button" className="primary-button" onClick={onConfirm}>
              确认入库
            </button>
          ) : null}
          {workbenchStatus.primaryStep === "review" ? (
            <button type="button" className="primary-button" onClick={() => onChange({ reviewEnabled: true })}>
              加入复习
            </button>
          ) : null}
          {workbenchStatus.primaryStep !== "done" ? (
            <button type="button" className="ghost-button" onClick={onStartRewrite}>
              去 Rewrite 打磨
            </button>
          ) : null}
        </div>
      </section>

      <section className="duplicate-panel" aria-label="可能重复素材">
        <div className="duplicate-panel-header">
          <span>可能重复</span>
          <strong>{duplicateHints.length}</strong>
        </div>
        {duplicateHints.length > 0 ? (
          <div className="duplicate-list">
            {duplicateHints.slice(0, 4).map((hint) => (
              <article key={hint.material.id} className="duplicate-item">
                <strong>{hint.material.title}</strong>
                <span>{hint.reasons.map(getDuplicateReasonLabel).join(" / ")}</span>
              </article>
            ))}
          </div>
        ) : (
          <p>暂未发现明显重复。</p>
        )}
      </section>

      <label className="switch-row">
        <input
          type="checkbox"
          checked={material.reviewEnabled}
          disabled={!qualityReport.reviewAllowed || material.status !== "active"}
          onChange={(event) => onChange({ reviewEnabled: event.target.checked })}
        />
        <span>{getReviewToggleLabel(material, qualityReport.reviewAllowed)}</span>
      </label>

      <button
        type="button"
        className="review-start-button"
        onClick={onStartReview}
        disabled={!material.reviewEnabled || !qualityReport.reviewAllowed || material.status !== "active"}
      >
        开始复习这条
      </button>

      <div className="stat-grid" aria-label="素材统计">
        <div>
          <span>字数</span>
          <strong>{wordCount}</strong>
        </div>
        <div>
          <span>标签</span>
          <strong>{material.tagNames.length}</strong>
        </div>
        <div>
          <span>状态</span>
          <strong>{material.status === "draft" ? "草稿" : "已入库"}</strong>
        </div>
        <div>
          <span>复习</span>
          <strong>{material.reviewEnabled ? formatNextReview(material.nextReviewAt) : "关闭"}</strong>
        </div>
      </div>

      <div className="inspector-note">
        <span>更新时间</span>
        <strong>{new Date(material.updatedAt).toLocaleString("zh-CN")}</strong>
      </div>

      <button type="button" className="reset-button" onClick={onResetExamples}>
        重置示例数据
      </button>
    </aside>
  );
}

function getWorkbenchStepLabel(step: ReturnType<typeof getMaterialWorkbenchStatus>["primaryStep"]): string {
  if (step === "rewrite") {
    return "先打磨正文";
  }

  if (step === "classify") {
    return "先补齐分类";
  }

  if (step === "intake") {
    return "确认入库";
  }

  if (step === "review") {
    return "可加入复习";
  }

  return "已完成";
}

function getReviewToggleLabel(material: MaterialDraft, reviewAllowed: boolean): string {
  if (!reviewAllowed) {
    return "质量达标后可加入复习";
  }

  if (material.status !== "active") {
    return "确认入库后可加入复习";
  }

  return "加入复习";
}

function getDuplicateReasonLabel(reason: MaterialDuplicateHint["reasons"][number]): string {
  if (reason === "same-title") {
    return "标题相同";
  }

  if (reason === "same-content") {
    return "正文相同";
  }

  if (reason === "content-overlap") {
    return "正文重叠";
  }

  return "来源相同";
}

function getQualityLevelLabel(level: MaterialQualityLevel): string {
  if (level === "candidate") {
    return "候选";
  }

  if (level === "refining") {
    return "待打磨";
  }

  if (level === "core") {
    return "高价值";
  }

  return "合格";
}

function toggleValue(values: readonly string[], value: string): readonly string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function countText(value: string): number {
  return value.replace(/\s+/g, "").length;
}

function formatNextReview(nextReviewAt: string | null): string {
  if (!nextReviewAt) {
    return "新卡";
  }

  const dueAt = new Date(nextReviewAt);
  return dueAt <= new Date() ? "到期" : dueAt.toLocaleDateString("zh-CN");
}
