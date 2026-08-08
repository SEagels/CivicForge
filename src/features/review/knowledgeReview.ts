import type { ReviewRating } from "../../domain/enums";
import type {
  Attempt,
  Exercise,
  KnowledgeCard,
  LearningWorkspaceState,
  ReviewCard,
  ReviewCardMode,
} from "../../domain/learning";
import { calculateNextReviewSchedule, type ReviewSchedule } from "./reviewScheduler";

export interface DueKnowledgeReview {
  readonly reviewCard: ReviewCard;
  readonly knowledgeCard: KnowledgeCard;
}

export interface KnowledgeReviewSession {
  readonly reviewCardId: string;
  readonly startedAt: string;
  readonly answerRevealedAt: string | null;
}

export interface KnowledgeReviewCompletion {
  readonly reviewCardId: string;
  readonly rating: ReviewRating;
  readonly reviewedAt: string;
  readonly elapsedMs: number;
}

export const REVIEW_MODE_LABELS: Readonly<Record<ReviewCardMode, string>> = {
  "key-point-recall": "要点回忆",
  "expression-recall": "表达复述",
  "case-application": "案例调用",
  "placement-recall": "位置调用",
  "micro-writing": "微型作答",
};

export function getDueKnowledgeReviews(
  workspace: LearningWorkspaceState,
  now: Date = new Date(),
  focusedReviewCardId: string | null = null,
): readonly DueKnowledgeReview[] {
  const cards = new Map(workspace.cards.map((card) => [card.id, card]));
  const due = workspace.reviewCards
    .filter((reviewCard) => isDue(reviewCard, now))
    .map((reviewCard) => ({ reviewCard, knowledgeCard: cards.get(reviewCard.knowledgeCardId) }))
    .filter((item): item is DueKnowledgeReview => Boolean(
      item.knowledgeCard
      && item.knowledgeCard.reviewEnabled
      && item.knowledgeCard.verificationStatus !== "unverified"
      && item.knowledgeCard.lifecycle !== "archived",
    ))
    .sort(compareDueReviews);

  if (!focusedReviewCardId) return due;
  const focused = workspace.reviewCards.find((item) => item.id === focusedReviewCardId);
  const knowledgeCard = focused ? cards.get(focused.knowledgeCardId) : null;
  if (!focused || !knowledgeCard || due.some((item) => item.reviewCard.id === focused.id)) return due;
  return [{ reviewCard: focused, knowledgeCard }, ...due];
}

export function startKnowledgeReviewSession(
  reviewCardId: string,
  now: Date = new Date(),
): KnowledgeReviewSession {
  return { reviewCardId, startedAt: now.toISOString(), answerRevealedAt: null };
}

export function revealKnowledgeReviewAnswer(
  session: KnowledgeReviewSession,
  now: Date = new Date(),
): KnowledgeReviewSession {
  return session.answerRevealedAt ? session : { ...session, answerRevealedAt: now.toISOString() };
}

export function completeKnowledgeReviewSession(
  session: KnowledgeReviewSession,
  rating: ReviewRating,
  now: Date = new Date(),
): KnowledgeReviewCompletion | null {
  if (!session.answerRevealedAt) return null;
  return {
    reviewCardId: session.reviewCardId,
    rating,
    reviewedAt: now.toISOString(),
    elapsedMs: Math.max(0, now.getTime() - Date.parse(session.startedAt)),
  };
}

export function applyKnowledgeReviewCompletion(
  workspace: LearningWorkspaceState,
  completion: KnowledgeReviewCompletion,
): LearningWorkspaceState {
  const reviewedAt = new Date(completion.reviewedAt);
  return {
    ...workspace,
    reviewCards: workspace.reviewCards.map((card) => {
      if (card.id !== completion.reviewCardId) return card;
      const next = calculateNextReviewSchedule(toSchedule(card), completion.rating, reviewedAt);
      return {
        ...card,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: next.lastReviewedAt,
        ease: next.reviewEase,
        intervalDays: next.reviewIntervalDays,
        repetitions: next.reviewRepetitions,
        lapses: next.reviewLapses,
      };
    }),
  };
}

export function createMicroPracticeFromReview(
  workspace: LearningWorkspaceState,
  reviewCardId: string,
  now: Date = new Date(),
): LearningWorkspaceState {
  const reviewCard = workspace.reviewCards.find((item) => item.id === reviewCardId);
  const card = reviewCard ? workspace.cards.find((item) => item.id === reviewCard.knowledgeCardId) : null;
  if (!reviewCard || !card) return workspace;

  const stamp = now.getTime();
  const exerciseId = `exercise-review-${stamp}`;
  const exercise: Exercise = {
    id: exerciseId,
    title: `微型作答：${card.title}`,
    promptMd: `${reviewCard.promptMd}\n\n请在 150 字以内完成作答，并尽量调用这张知识卡。`,
    questionTypeSlug: card.questionTypeSlugs[0] ?? "analysis",
    wordLimit: 150,
    timeLimitMinutes: 8,
    status: "active",
    currentStage: "answer",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const attempt: Attempt = {
    id: `attempt-review-${stamp}`,
    exerciseId,
    outlineMd: "",
    answerMd: "",
    status: "in-progress",
    startedAt: now.toISOString(),
    finishedAt: null,
    elapsedMs: 0,
    updatedAt: now.toISOString(),
  };
  return {
    ...workspace,
    exercises: [exercise, ...workspace.exercises],
    attempts: [attempt, ...workspace.attempts],
  };
}

export function getKnowledgeReviewSummary(workspace: LearningWorkspaceState, now: Date = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const reviewedToday = workspace.reviewCards.filter(
    (card) => card.lastReviewedAt && Date.parse(card.lastReviewedAt) >= start.getTime(),
  );
  return {
    dueCount: getDueKnowledgeReviews(workspace, now).length,
    reviewedTodayCount: reviewedToday.length,
    weakCount: workspace.reviewCards.filter((card) => card.lapses > 0 || card.ease < 2.3).length,
  } as const;
}

function toSchedule(card: ReviewCard): ReviewSchedule {
  return {
    reviewEase: card.ease,
    reviewIntervalDays: card.intervalDays,
    reviewRepetitions: card.repetitions,
    reviewLapses: card.lapses,
    nextReviewAt: card.nextReviewAt,
    lastReviewedAt: card.lastReviewedAt,
  };
}

function isDue(card: ReviewCard, now: Date): boolean {
  return !card.nextReviewAt || Date.parse(card.nextReviewAt) <= now.getTime();
}

function compareDueReviews(left: DueKnowledgeReview, right: DueKnowledgeReview): number {
  if (!left.reviewCard.nextReviewAt && right.reviewCard.nextReviewAt) return -1;
  if (left.reviewCard.nextReviewAt && !right.reviewCard.nextReviewAt) return 1;
  if (left.reviewCard.nextReviewAt && right.reviewCard.nextReviewAt) {
    return Date.parse(left.reviewCard.nextReviewAt) - Date.parse(right.reviewCard.nextReviewAt);
  }
  return left.knowledgeCard.title.localeCompare(right.knowledgeCard.title, "zh-CN");
}
