import { describe, expect, it } from "vitest";
import type { MaterialDraft } from "../materials/materialModel";
import {
  applyReviewRating,
  createDefaultReviewSchedule,
  getDueReviewMaterials,
  getTodayReviewCount,
} from "./reviewScheduler";

const NOW = new Date("2026-05-23T08:00:00.000Z");

describe("review scheduler", () => {
  it("creates a due default schedule for new review-enabled materials", () => {
    const schedule = createDefaultReviewSchedule();

    expect(schedule).toMatchObject({
      reviewEase: 2.5,
      reviewIntervalDays: 0,
      reviewRepetitions: 0,
      reviewLapses: 0,
      nextReviewAt: null,
      lastReviewedAt: null,
    });
  });

  it("returns enabled active materials due by now in stable due order", () => {
    const dueYesterday = makeMaterial("due-yesterday", {
      nextReviewAt: "2026-05-22T08:00:00.000Z",
      updatedAt: "2026-05-20T08:00:00.000Z",
    });
    const newReviewCard = makeMaterial("new-card", {
      nextReviewAt: null,
      updatedAt: "2026-05-21T08:00:00.000Z",
    });
    const future = makeMaterial("future", {
      nextReviewAt: "2026-05-24T08:00:00.000Z",
    });
    const disabled = makeMaterial("disabled", {
      reviewEnabled: false,
      nextReviewAt: "2026-05-22T08:00:00.000Z",
    });
    const archived = makeMaterial("archived", {
      status: "archived",
      nextReviewAt: "2026-05-22T08:00:00.000Z",
    });

    expect(getDueReviewMaterials([future, disabled, newReviewCard, archived, dueYesterday], NOW).map((item) => item.id)).toEqual([
      "new-card",
      "due-yesterday",
    ]);
  });

  it("counts review-enabled materials due by the end of today", () => {
    const laterToday = new Date(NOW);
    laterToday.setHours(23, 59, 0, 0);
    const tomorrow = new Date(NOW);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const materials = [
      makeMaterial("new-card", { nextReviewAt: null }),
      makeMaterial("due-now", { nextReviewAt: "2026-05-23T08:00:00.000Z" }),
      makeMaterial("due-tonight", { nextReviewAt: laterToday.toISOString() }),
      makeMaterial("tomorrow", { nextReviewAt: tomorrow.toISOString() }),
    ];

    expect(getTodayReviewCount(materials, NOW)).toBe(3);
  });

  it("schedules again reviews soon and records a lapse", () => {
    const reviewed = applyReviewRating(
      makeMaterial("card", {
        reviewEase: 2.5,
        reviewIntervalDays: 5,
        reviewRepetitions: 3,
        reviewLapses: 1,
      }),
      "again",
      NOW,
    );

    expect(reviewed.reviewEase).toBe(2.3);
    expect(reviewed.reviewIntervalDays).toBe(0);
    expect(reviewed.reviewRepetitions).toBe(0);
    expect(reviewed.reviewLapses).toBe(2);
    expect(reviewed.nextReviewAt).toBe("2026-05-23T08:10:00.000Z");
    expect(reviewed.lastReviewedAt).toBe(NOW.toISOString());
  });

  it("schedules hard, good, and easy ratings with increasing intervals", () => {
    const base = makeMaterial("card", {
      reviewEase: 2.5,
      reviewIntervalDays: 4,
      reviewRepetitions: 2,
    });

    const hard = applyReviewRating(base, "hard", NOW);
    const good = applyReviewRating(base, "good", NOW);
    const easy = applyReviewRating(base, "easy", NOW);

    expect(hard.reviewIntervalDays).toBe(5);
    expect(hard.reviewEase).toBe(2.35);
    expect(good.reviewIntervalDays).toBe(10);
    expect(good.reviewEase).toBe(2.5);
    expect(easy.reviewIntervalDays).toBe(15);
    expect(easy.reviewEase).toBe(2.65);
    expect(Date.parse(hard.nextReviewAt ?? "")).toBeLessThan(Date.parse(good.nextReviewAt ?? ""));
    expect(Date.parse(good.nextReviewAt ?? "")).toBeLessThan(Date.parse(easy.nextReviewAt ?? ""));
  });
});

function makeMaterial(id: string, patch: Partial<MaterialDraft> = {}): MaterialDraft {
  return {
    id,
    title: id,
    contentMd: "内容",
    excerpt: "内容",
    materialType: "standard-expression",
    topicSlug: "grassroots-governance",
    tagNames: [],
    questionTypeSlugs: ["general"],
    source: "",
    status: "active",
    favorite: false,
    reviewEnabled: true,
    reviewEase: 2.5,
    reviewIntervalDays: 0,
    reviewRepetitions: 0,
    reviewLapses: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    updatedAt: "2026-05-22T08:00:00.000Z",
    ...patch,
  };
}
