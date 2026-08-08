import { describe, expect, it } from "vitest";
import type { KnowledgeCard, LearningWorkspaceState, ReviewCard } from "../../domain/learning";
import { EMPTY_LEARNING_WORKSPACE } from "../../domain/learning";
import {
  applyKnowledgeReviewCompletion,
  completeKnowledgeReviewSession,
  createMicroPracticeFromReview,
  getDueKnowledgeReviews,
  revealKnowledgeReviewAnswer,
  startKnowledgeReviewSession,
} from "./knowledgeReview";

describe("knowledge review", () => {
  it("only queues due review cards backed by verified active knowledge cards", () => {
    const workspace = createWorkspace();
    expect(getDueKnowledgeReviews(workspace, new Date("2026-08-08T10:00:00.000Z"))).toHaveLength(1);
  });

  it("requires the answer to be revealed before rating", () => {
    const started = startKnowledgeReviewSession("review-1", new Date("2026-08-08T10:00:00.000Z"));
    expect(completeKnowledgeReviewSession(started, "good")).toBeNull();
    const revealed = revealKnowledgeReviewAnswer(started, new Date("2026-08-08T10:00:05.000Z"));
    expect(completeKnowledgeReviewSession(revealed, "good", new Date("2026-08-08T10:00:20.000Z"))).toMatchObject({ elapsedMs: 20_000 });
  });

  it("updates the review card schedule for Again", () => {
    const completion = { reviewCardId: "review-1", rating: "again" as const, reviewedAt: "2026-08-08T10:00:00.000Z", elapsedMs: 1000 };
    const next = applyKnowledgeReviewCompletion(createWorkspace(), completion);
    expect(next.reviewCards[0]).toMatchObject({ lapses: 1, repetitions: 0, intervalDays: 0, nextReviewAt: "2026-08-08T10:10:00.000Z" });
  });

  it("creates an eight-minute micro practice from a weak review", () => {
    const next = createMicroPracticeFromReview(createWorkspace(), "review-1", new Date("2026-08-08T10:00:00.000Z"));
    expect(next.exercises[0]).toMatchObject({ title: "微型作答：基层治理", wordLimit: 150, timeLimitMinutes: 8, currentStage: "answer" });
    expect(next.attempts[0].exerciseId).toBe(next.exercises[0].id);
  });
});

function createWorkspace(): LearningWorkspaceState {
  const card: KnowledgeCard = {
    id: "card-1", title: "基层治理", contentMd: "完整答案", summary: "摘要", cardType: "standard-expression",
    topicSlug: "grassroots-governance", lifecycle: "usable", verificationStatus: "user-verified", core: false,
    reviewEnabled: true, sourceLabel: "人工整理", tagNames: [], questionTypeSlugs: ["analysis"],
    createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z",
  };
  const review: ReviewCard = {
    id: "review-1", knowledgeCardId: card.id, mode: "key-point-recall", promptMd: "回忆要点", answerMd: "完整答案",
    nextReviewAt: null, lastReviewedAt: null, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0,
  };
  return { ...EMPTY_LEARNING_WORKSPACE, cards: [card], reviewCards: [review] };
}
