import type { ReviewRating } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft } from "../materials/materialModel";
import { getDueReviewMaterials, getTodayReviewCount } from "./reviewScheduler";

interface ReviewPanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly focusedMaterialId: string | null;
  readonly onRate: (materialId: string, rating: ReviewRating) => void;
  readonly onBackToLibrary: () => void;
  readonly onEditMaterial: (materialId: string) => void;
}

const RATING_ACTIONS: readonly {
  readonly rating: ReviewRating;
  readonly label: string;
  readonly detail: string;
}[] = [
  { rating: "again", label: "Again", detail: "10 分钟" },
  { rating: "hard", label: "Hard", detail: "勉强记得" },
  { rating: "good", label: "Good", detail: "正常推进" },
  { rating: "easy", label: "Easy", detail: "很熟" },
];

const materialTypeNameBySlug: ReadonlyMap<string, string> = new Map(
  BUILTIN_MATERIAL_TYPES.map((type) => [type.slug, type.name]),
);
const topicNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));

export function ReviewPanel({
  materials,
  focusedMaterialId,
  onRate,
  onBackToLibrary,
  onEditMaterial,
}: ReviewPanelProps) {
  const now = new Date();
  const dueMaterials = getDueReviewMaterials(materials, now);
  const focusedMaterial = focusedMaterialId ? materials.find((material) => material.id === focusedMaterialId) : null;
  const queue = buildReviewQueue(dueMaterials, focusedMaterial);
  const current = queue[0] ?? null;
  const todayCount = getTodayReviewCount(materials, now);

  return (
    <section className="review-workspace" aria-label="复习">
      <div className="review-header">
        <div>
          <p className="eyebrow">Review</p>
          <h1>今日复习</h1>
        </div>
        <button type="button" className="ghost-button" onClick={onBackToLibrary}>
          返回素材库
        </button>
      </div>

      <div className="review-summary" aria-label="复习统计">
        <div>
          <span>今日待复习</span>
          <strong>{todayCount}</strong>
        </div>
        <div>
          <span>当前队列</span>
          <strong>{queue.length}</strong>
        </div>
      </div>

      {current ? (
        <article className="review-card" aria-label="当前复习素材">
          <div className="review-card-header">
            <div>
              <span>{materialTypeNameBySlug.get(current.materialType) ?? current.materialType}</span>
              <h2>{current.title}</h2>
            </div>
            <span className="due-chip">{formatDueText(current.nextReviewAt)}</span>
          </div>

          <div className="review-source-line">
            <span>{topicNameBySlug.get(current.topicSlug) ?? current.topicSlug}</span>
            <span>{current.source || "未标来源"}</span>
          </div>

          <div className="review-content">{current.contentMd || current.excerpt || "空白素材"}</div>

          <div className="review-meta">
            <span>间隔 {current.reviewIntervalDays} 天</span>
            <span>次数 {current.reviewRepetitions}</span>
            <span>Ease {current.reviewEase.toFixed(2)}</span>
          </div>

          <div className="rating-grid" aria-label="复习反馈">
            {RATING_ACTIONS.map((action) => (
              <button
                key={action.rating}
                type="button"
                className={`rating-button ${action.rating}`}
                onClick={() => onRate(current.id, action.rating)}
              >
                <strong>{action.label}</strong>
                <span>{action.detail}</span>
              </button>
            ))}
          </div>

          <div className="review-card-actions">
            <button type="button" className="ghost-button" onClick={() => onEditMaterial(current.id)}>
              返回编辑当前素材
            </button>
          </div>
        </article>
      ) : (
        <div className="review-empty">
          <h2>今天暂时没有到期素材</h2>
          <p>可以回到素材库继续整理表达。</p>
          <button type="button" className="primary-button" onClick={onBackToLibrary}>
            回到素材库
          </button>
        </div>
      )}
    </section>
  );
}

function buildReviewQueue(
  dueMaterials: readonly MaterialDraft[],
  focusedMaterial: MaterialDraft | null | undefined,
): readonly MaterialDraft[] {
  if (!focusedMaterial || !isReviewable(focusedMaterial)) {
    return dueMaterials;
  }

  if (dueMaterials.some((material) => material.id === focusedMaterial.id)) {
    return dueMaterials;
  }

  return [focusedMaterial, ...dueMaterials];
}

function isReviewable(material: MaterialDraft): boolean {
  return material.reviewEnabled && (material.status === "active" || material.status === "draft");
}

function formatDueText(nextReviewAt: string | null): string {
  if (!nextReviewAt) {
    return "新素材";
  }

  return new Date(nextReviewAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
