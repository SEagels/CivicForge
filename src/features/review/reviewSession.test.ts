import { describe, expect, it } from "vitest";
import type { MaterialDraft } from "../materials/materialModel";
import { createDefaultReviewSchedule, readReviewSchedule } from "./reviewScheduler";
import {
  buildReviewLogEntry,
  completeReviewSession,
  revealReviewAnswer,
  startReviewSession,
} from "./reviewSession";

const NOW = new Date("2026-05-28T08:00:00.000Z");

describe("review active recall session", () => {
  it("does not complete a rating before the answer is revealed", () => {
    const session = startReviewSession(makeMaterial(), NOW);

    expect(completeReviewSession(session, "good", new Date("2026-05-28T08:01:00.000Z"))).toBeNull();
  });

  it("records when the answer is revealed and completes with elapsed time", () => {
    const session = startReviewSession(makeMaterial(), NOW);
    const revealed = revealReviewAnswer(session, new Date("2026-05-28T08:00:30.000Z"));
    const completed = completeReviewSession(revealed, "hard", new Date("2026-05-28T08:01:45.000Z"));

    expect(completed).toMatchObject({
      materialId: "mat-review",
      mode: "active-recall",
      startedAt: "2026-05-28T08:00:00.000Z",
      answerRevealedAt: "2026-05-28T08:00:30.000Z",
      completedAt: "2026-05-28T08:01:45.000Z",
      rating: "hard",
      elapsedMs: 105_000,
    });
  });

  it("builds a review log with schedule deltas and material metadata", () => {
    const material = makeMaterial({
      reviewEase: 2.5,
      reviewIntervalDays: 3,
      nextReviewAt: "2026-05-28T07:00:00.000Z",
    });
    const previousSchedule = readReviewSchedule(material);
    const nextMaterial = {
      ...material,
      reviewEase: 2.35,
      reviewIntervalDays: 4,
      nextReviewAt: "2026-06-01T08:01:45.000Z",
      lastReviewedAt: "2026-05-28T08:01:45.000Z",
    };
    const completed = completeReviewSession(
      revealReviewAnswer(startReviewSession(material, NOW), new Date("2026-05-28T08:00:30.000Z")),
      "hard",
      new Date("2026-05-28T08:01:45.000Z"),
    );

    expect(completed).not.toBeNull();
    expect(buildReviewLogEntry(material, previousSchedule, nextMaterial, completed!, "review-fixed")).toEqual({
      id: "review-fixed",
      materialId: "mat-review",
      reviewedAt: "2026-05-28T08:01:45.000Z",
      rating: "hard",
      reviewMode: "active-recall",
      topicSlug: "grassroots-governance",
      questionTypeSlugs: ["countermeasure", "essay"],
      materialType: "standard-expression",
      previousDueAt: "2026-05-28T07:00:00.000Z",
      nextDueAt: "2026-06-01T08:01:45.000Z",
      previousIntervalDays: 3,
      nextIntervalDays: 4,
      previousEase: 2.5,
      nextEase: 2.35,
      elapsedMs: 105_000,
      answerRevealedAt: "2026-05-28T08:00:30.000Z",
      note: "",
    });
  });
});

function makeMaterial(patch: Partial<MaterialDraft> = {}): MaterialDraft {
  return {
    id: "mat-review",
    title: "基层治理：主动服务",
    contentMd: "推动治理资源下沉，把服务触角延伸到群众身边。",
    excerpt: "治理资源下沉，服务触角前移。",
    materialType: "standard-expression",
    topicSlug: "grassroots-governance",
    tagNames: ["基层治理"],
    questionTypeSlugs: ["countermeasure", "essay"],
    source: "政策材料",
    status: "active",
    favorite: false,
    reviewEnabled: true,
    ...createDefaultReviewSchedule(),
    updatedAt: "2026-05-28T07:00:00.000Z",
    ...patch,
  };
}
