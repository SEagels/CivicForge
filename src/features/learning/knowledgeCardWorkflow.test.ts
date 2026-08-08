import { describe, expect, it } from "vitest";
import type { KnowledgeCard, LearningWorkspaceState } from "../../domain/learning";
import { EMPTY_LEARNING_WORKSPACE } from "../../domain/learning";
import {
  buildKnowledgeCardChecklist,
  enableKnowledgeCardReview,
  insertKnowledgeCardIntoAttempt,
  verifyKnowledgeCard,
} from "./knowledgeCardWorkflow";

describe("knowledge card workflow", () => {
  it("requires classification, question type, content, and a traceable source", () => {
    const card = createCard({ title: "短", contentMd: "内容", topicSlug: "", questionTypeSlugs: [], sourceLabel: "" });
    const checklist = buildKnowledgeCardChecklist(card, workspaceWith(card));

    expect(checklist.map((item) => [item.id, item.passed])).toEqual([
      ["title", false],
      ["content", false],
      ["topic", false],
      ["question-type", false],
      ["source", false],
    ]);
  });

  it("verifies a complete card and keeps structured provenance", () => {
    const card = createCard();
    const workspace = {
      ...workspaceWith(card),
      cardSources: [{ cardId: card.id, sourceDocumentId: null, sourceExcerptId: null, attemptId: "attempt-1", relationType: "extracted-from" as const, createdAt: "2026-08-08T10:00:00.000Z" }],
    };

    const next = verifyKnowledgeCard(workspace, card.id, new Date("2026-08-08T11:00:00.000Z"));

    expect(next.cards[0]).toMatchObject({ lifecycle: "usable", verificationStatus: "source-verified" });
  });

  it("creates a selected review mode only after verification", () => {
    const card = createCard({ verificationStatus: "user-verified", lifecycle: "usable" });
    const next = enableKnowledgeCardReview(workspaceWith(card), card.id, "expression-recall");

    expect(next.cards[0].reviewEnabled).toBe(true);
    expect(next.reviewCards[0]).toMatchObject({
      knowledgeCardId: card.id,
      mode: "expression-recall",
      answerMd: card.contentMd,
    });
  });

  it("inserts a verified card into an answer and records the exact usage", () => {
    const card = createCard({ verificationStatus: "source-verified", lifecycle: "usable" });
    const workspace: LearningWorkspaceState = {
      ...workspaceWith(card),
      attempts: [{ id: "attempt-1", exerciseId: "exercise-1", outlineMd: "", answerMd: "原有作答。", status: "in-progress", startedAt: "2026-08-08T10:00:00.000Z", finishedAt: null, elapsedMs: 0, updatedAt: "2026-08-08T10:00:00.000Z" }],
    };

    const next = insertKnowledgeCardIntoAttempt(workspace, card.id, "attempt-1", "argument", new Date("2026-08-08T11:00:00.000Z"));

    expect(next.attempts[0].answerMd).toBe(`原有作答。\n\n${card.contentMd}`);
    expect(next.cardUsages[0]).toMatchObject({ cardId: card.id, attemptId: "attempt-1", usageKind: "argument", slotKey: "answer" });
  });
});

function workspaceWith(card: KnowledgeCard): LearningWorkspaceState {
  return { ...EMPTY_LEARNING_WORKSPACE, cards: [card] };
}

function createCard(patch: Partial<KnowledgeCard> = {}): KnowledgeCard {
  return {
    id: "card-1",
    title: "基层治理服务前移",
    contentMd: "推动治理资源下沉网格，把服务触角延伸到群众身边，及时回应群众急难愁盼。",
    summary: "治理资源下沉，服务触角前移。",
    cardType: "standard-expression",
    topicSlug: "grassroots-governance",
    lifecycle: "refining",
    verificationStatus: "unverified",
    core: false,
    reviewEnabled: false,
    sourceLabel: "半月谈",
    tagNames: ["基层治理"],
    questionTypeSlugs: ["analysis"],
    createdAt: "2026-08-08T10:00:00.000Z",
    updatedAt: "2026-08-08T10:00:00.000Z",
    ...patch,
  };
}
