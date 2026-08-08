import { useEffect, useMemo, useState } from "react";
import type { ReviewRating } from "../../domain/enums";
import type { LearningWorkspaceState } from "../../domain/learning";
import {
  REVIEW_MODE_LABELS,
  completeKnowledgeReviewSession,
  getDueKnowledgeReviews,
  getKnowledgeReviewSummary,
  revealKnowledgeReviewAnswer,
  startKnowledgeReviewSession,
  type KnowledgeReviewCompletion,
  type KnowledgeReviewSession,
} from "./knowledgeReview";

interface KnowledgeReviewPanelProps {
  readonly workspace: LearningWorkspaceState;
  readonly focusedReviewCardId: string | null;
  readonly onComplete: (completion: KnowledgeReviewCompletion) => void;
  readonly onEditCard: (cardId: string) => void;
  readonly onCreateMicroPractice: (reviewCardId: string) => void;
  readonly onBackToLibrary: () => void;
}

const RATINGS: readonly { rating: ReviewRating; label: string; detail: string }[] = [
  { rating: "again", label: "Again", detail: "10 分钟后" },
  { rating: "hard", label: "Hard", detail: "勉强记得" },
  { rating: "good", label: "Good", detail: "正常推进" },
  { rating: "easy", label: "Easy", detail: "非常熟悉" },
];

export function KnowledgeReviewPanel({
  workspace,
  focusedReviewCardId,
  onComplete,
  onEditCard,
  onCreateMicroPractice,
  onBackToLibrary,
}: KnowledgeReviewPanelProps) {
  const queue = useMemo(
    () => getDueKnowledgeReviews(workspace, new Date(), focusedReviewCardId),
    [focusedReviewCardId, workspace],
  );
  const summary = useMemo(() => getKnowledgeReviewSummary(workspace), [workspace]);
  const current = queue[0] ?? null;
  const [session, setSession] = useState<KnowledgeReviewSession | null>(null);
  const [lastWeakReview, setLastWeakReview] = useState<{ reviewCardId: string; cardId: string } | null>(null);

  useEffect(() => {
    setSession(current ? startKnowledgeReviewSession(current.reviewCard.id) : null);
  }, [current?.reviewCard.id]);

  const rate = (rating: ReviewRating) => {
    if (!current || !session) return;
    const completion = completeKnowledgeReviewSession(session, rating);
    if (!completion) return;
    setLastWeakReview(
      rating === "again" || rating === "hard"
        ? { reviewCardId: current.reviewCard.id, cardId: current.knowledgeCard.id }
        : null,
    );
    setSession(null);
    onComplete(completion);
  };

  return (
    <section className="review-workspace knowledge-review-workspace" aria-label="知识卡复习">
      <header className="review-header">
        <div>
          <p className="eyebrow">ACTIVE RECALL</p>
          <h1>知识卡主动回忆</h1>
        </div>
        <button type="button" className="ghost-button" onClick={onBackToLibrary}>返回知识卡</button>
      </header>

      <div className="review-summary knowledge-review-summary" aria-label="复习概况">
        <div><span>当前到期</span><strong>{summary.dueCount}</strong></div>
        <div><span>今日完成</span><strong>{summary.reviewedTodayCount}</strong></div>
        <div><span>待加强</span><strong>{summary.weakCount}</strong></div>
        <div><span>队列剩余</span><strong>{queue.length}</strong></div>
      </div>

      {lastWeakReview ? (
        <aside className="review-followup" aria-label="弱项后续动作">
          <div><strong>这张卡需要再加工</strong><span>现在补清表达，或用一次短作答把它真正调用出来。</span></div>
          <button type="button" className="ghost-button" onClick={() => onEditCard(lastWeakReview.cardId)}>回到知识卡</button>
          <button type="button" className="primary-button" onClick={() => onCreateMicroPractice(lastWeakReview.reviewCardId)}>创建微型训练</button>
          <button type="button" className="icon-button" aria-label="关闭提示" onClick={() => setLastWeakReview(null)}>×</button>
        </aside>
      ) : null}

      {current ? (
        <article className="review-card knowledge-review-card">
          <div className="review-card-header">
            <div>
              <span>{REVIEW_MODE_LABELS[current.reviewCard.mode]}</span>
              <h2>{current.knowledgeCard.title}</h2>
            </div>
            <span className="due-chip">{formatPosition(1, queue.length)}</span>
          </div>

          <div className="review-source-line">
            <span>{current.knowledgeCard.topicSlug || "未分类主题"}</span>
            <span>{current.knowledgeCard.cardType}</span>
            <span>{current.knowledgeCard.sourceLabel || "未标来源"}</span>
          </div>

          <div className="knowledge-review-prompt">
            <span>回忆任务</span>
            <p>{current.reviewCard.promptMd}</p>
          </div>

          {session?.answerRevealedAt ? (
            <div className="knowledge-review-answer">
              <span>参考答案</span>
              <div className="review-content">{current.reviewCard.answerMd || current.knowledgeCard.contentMd}</div>
            </div>
          ) : (
            <button
              type="button"
              className="primary-button reveal-answer-button"
              onClick={() => setSession((value) => value ? revealKnowledgeReviewAnswer(value) : value)}
            >
              显示答案
            </button>
          )}

          <div className="rating-grid" aria-label="复习评分">
            {RATINGS.map((item) => (
              <button
                key={item.rating}
                type="button"
                className={`rating-button ${item.rating}`}
                disabled={!session?.answerRevealedAt}
                onClick={() => rate(item.rating)}
              >
                <strong>{item.label}</strong><span>{item.detail}</span>
              </button>
            ))}
          </div>
        </article>
      ) : (
        <div className="review-empty">
          <h2>今天的知识卡已经复习完了</h2>
          <p>可以回到知识卡整理弱项，或去训练页完成一次真实调用。</p>
          <button type="button" className="primary-button" onClick={onBackToLibrary}>查看知识卡</button>
        </div>
      )}
    </section>
  );
}

function formatPosition(current: number, total: number): string {
  return `${current} / ${total}`;
}
