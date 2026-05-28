import { useEffect, useMemo, useState } from "react";
import type { ReviewRating } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft } from "../materials/materialModel";
import { getDueReviewMaterials, getTodayReviewCount } from "./reviewScheduler";
import {
  completeReviewSession,
  revealReviewAnswer,
  startReviewSession,
  type CompletedReviewSessionState,
  type ReviewLog,
  type ReviewSessionState,
} from "./reviewSession";
import { summarizeReviewLogs, type ReviewStatsSummary, type WeakReviewArea } from "./reviewStats";

interface ReviewPanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly reviewLogs: readonly ReviewLog[];
  readonly focusedMaterialId: string | null;
  readonly onRate: (materialId: string, rating: ReviewRating, session: CompletedReviewSessionState) => void;
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
const questionTypeNameBySlug: ReadonlyMap<string, string> = new Map(
  BUILTIN_QUESTION_TYPES.map((type) => [type.slug, type.name]),
);
const topicNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));

export function ReviewPanel({
  materials,
  reviewLogs,
  focusedMaterialId,
  onRate,
  onBackToLibrary,
  onEditMaterial,
}: ReviewPanelProps) {
  const [session, setSession] = useState<ReviewSessionState | null>(null);
  const now = new Date();
  const dueMaterials = getDueReviewMaterials(materials, now);
  const focusedMaterial = focusedMaterialId ? materials.find((material) => material.id === focusedMaterialId) : null;
  const queue = buildReviewQueue(dueMaterials, focusedMaterial);
  const current = queue[0] ?? null;
  const todayCount = getTodayReviewCount(materials, now);
  const stats = useMemo(() => summarizeReviewLogs(reviewLogs, materials, now), [materials, now, reviewLogs]);
  const answerRevealed = Boolean(session?.answerRevealedAt);

  useEffect(() => {
    setSession(current ? startReviewSession(current) : null);
  }, [current?.id]);

  const revealAnswer = () => {
    setSession((currentSession) => (currentSession ? revealReviewAnswer(currentSession) : currentSession));
  };

  const rateCurrent = (rating: ReviewRating) => {
    if (!current || !session) {
      return;
    }

    const completed = completeReviewSession(session, rating);

    if (!completed) {
      return;
    }

    setSession(null);
    onRate(current.id, rating, completed);
  };

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
        <div>
          <span>今日已完成</span>
          <strong>{stats.todayCompletedCount}</strong>
        </div>
        <div>
          <span>近 7 天正确率</span>
          <strong>{formatRetention(stats.sevenDayRetentionRate)}</strong>
        </div>
        <div>
          <span>平均耗时</span>
          <strong>{formatElapsed(stats.averageElapsedMs)}</strong>
        </div>
        <div>
          <span>今日 Again</span>
          <strong>{stats.todayAgainCount}</strong>
        </div>
      </div>

      <ReviewStatsPanel stats={stats} />

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
            <span>{formatQuestionTypes(current.questionTypeSlugs)}</span>
            <span>{current.source || "未标来源"}</span>
          </div>

          {answerRevealed ? (
            <div className="review-content">{current.contentMd || current.excerpt || "空白素材"}</div>
          ) : (
            <div className="review-recall-prompt">
              <strong>先主动回忆，再显示答案</strong>
              <p>围绕这条素材的主题、题型和标题，先在脑中复述它可以怎样用于申论作答。</p>
              <span>提示：想清楚核心表达、适用场景和能放进哪个答题位置。</span>
            </div>
          )}

          <div className="review-meta">
            <span>间隔 {current.reviewIntervalDays} 天</span>
            <span>次数 {current.reviewRepetitions}</span>
            <span>Ease {current.reviewEase.toFixed(2)}</span>
            <span>{answerRevealed ? `已显示答案 ${formatDueText(session?.answerRevealedAt ?? null)}` : "答案未显示"}</span>
          </div>

          <button type="button" className="primary-button reveal-answer-button" onClick={revealAnswer} disabled={answerRevealed}>
            {answerRevealed ? "答案已显示" : "显示答案"}
          </button>

          <div className="rating-grid" aria-label="复习反馈">
            {RATING_ACTIONS.map((action) => (
              <button
                key={action.rating}
                type="button"
                className={`rating-button ${action.rating}`}
                onClick={() => rateCurrent(action.rating)}
                disabled={!answerRevealed}
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

function ReviewStatsPanel({ stats }: { readonly stats: ReviewStatsSummary }) {
  return (
    <section className="review-stats-panel" aria-label="复习表现统计">
      <div className="answer-section-title compact">
        <div>
          <p className="eyebrow">Stats</p>
          <h2>近 7 天表现</h2>
        </div>
        <span>{stats.sevenDayCompletedCount} 次</span>
      </div>

      {stats.sevenDayCompletedCount === 0 ? (
        <div className="review-stats-empty">
          <strong>暂无复习记录</strong>
          <span>完成主动回忆后，这里会显示正确率、耗时和薄弱主题。</span>
        </div>
      ) : (
        <div className="weak-area-list">
          {stats.weakAreas.length === 0 ? (
            <div className="review-stats-empty compact">
              <strong>近 7 天没有明显薄弱项</strong>
              <span>继续保持 Again / Hard 的复盘记录。</span>
            </div>
          ) : (
            stats.weakAreas.map((area) => <WeakAreaItem key={`${area.kind}:${area.key}`} area={area} />)
          )}
        </div>
      )}
    </section>
  );
}

function WeakAreaItem({ area }: { readonly area: WeakReviewArea }) {
  return (
    <article className="weak-area-item">
      <div>
        <span>{formatWeakAreaKind(area.kind)}</span>
        <strong>{area.label}</strong>
      </div>
      <span>
        {area.weakCount}/{area.totalCount} 次偏弱 · {Math.round(area.weakRate * 100)}%
      </span>
    </article>
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

function formatQuestionTypes(questionTypeSlugs: readonly string[]): string {
  return questionTypeSlugs.map((slug) => questionTypeNameBySlug.get(slug) ?? slug).join(" / ");
}

function formatRetention(value: number | null): string {
  return value === null ? "-" : `${Math.round(value * 100)}%`;
}

function formatElapsed(value: number | null): string {
  if (value === null) {
    return "-";
  }

  const seconds = Math.round(value / 1000);

  if (seconds < 60) {
    return `${seconds} 秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes} 分`;
}

function formatWeakAreaKind(kind: WeakReviewArea["kind"]): string {
  if (kind === "topic") {
    return "主题";
  }

  if (kind === "questionType") {
    return "题型";
  }

  return "类型";
}
