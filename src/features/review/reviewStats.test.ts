import { describe, expect, it } from "vitest";
import type { MaterialDraft } from "../materials/materialModel";
import { createDefaultReviewSchedule } from "./reviewScheduler";
import type { ReviewLog } from "./reviewSession";
import { summarizeReviewLogs } from "./reviewStats";

const NOW = new Date("2026-05-28T20:00:00+08:00");

describe("review stats", () => {
  it("summarizes today, seven-day performance, and weak areas", () => {
    const materials = [makeMaterial("mat-a", "grassroots-governance"), makeMaterial("mat-b", "digital-government")];
    const logs: readonly ReviewLog[] = [
      makeLog("log-1", "mat-a", "again", "grassroots-governance", ["countermeasure"], "2026-05-28T08:00:00.000Z", 90_000),
      makeLog("log-2", "mat-a", "good", "grassroots-governance", ["countermeasure"], "2026-05-28T09:00:00.000Z", 60_000),
      makeLog("log-3", "mat-b", "hard", "digital-government", ["implementation"], "2026-05-27T09:00:00.000Z", 120_000),
      makeLog("old", "mat-b", "again", "digital-government", ["implementation"], "2026-05-18T09:00:00.000Z", 30_000),
    ];

    const summary = summarizeReviewLogs(logs, materials, NOW);

    expect(summary).toMatchObject({
      todayCompletedCount: 2,
      todayAgainCount: 1,
      sevenDayCompletedCount: 3,
      sevenDayRetentionRate: 0.67,
      averageElapsedMs: 90_000,
    });
    expect(summary.weakAreas[0]).toMatchObject({
      kind: "topic",
      key: "grassroots-governance",
      label: "基层治理",
      weakCount: 1,
      totalCount: 2,
      weakRate: 0.5,
    });
    expect(summary.weakAreas.some((area) => area.kind === "questionType" && area.key === "implementation")).toBe(true);
  });

  it("returns an empty-state summary when there are no logs", () => {
    expect(summarizeReviewLogs([], [], NOW)).toEqual({
      todayCompletedCount: 0,
      todayAgainCount: 0,
      sevenDayCompletedCount: 0,
      sevenDayRetentionRate: null,
      averageElapsedMs: null,
      weakAreas: [],
    });
  });
});

function makeMaterial(id: string, topicSlug: string): MaterialDraft {
  return {
    id,
    title: id,
    contentMd: "推动治理资源下沉，把服务触角延伸到群众身边。",
    excerpt: "治理资源下沉，服务触角前移。",
    materialType: "standard-expression",
    topicSlug,
    tagNames: ["基层治理"],
    questionTypeSlugs: ["countermeasure"],
    source: "政策材料",
    status: "active",
    favorite: false,
    reviewEnabled: true,
    ...createDefaultReviewSchedule(),
    updatedAt: "2026-05-28T07:00:00.000Z",
  };
}

function makeLog(
  id: string,
  materialId: string,
  rating: ReviewLog["rating"],
  topicSlug: string,
  questionTypeSlugs: readonly string[],
  reviewedAt: string,
  elapsedMs: number,
): ReviewLog {
  return {
    id,
    materialId,
    reviewedAt,
    rating,
    reviewMode: "active-recall",
    topicSlug,
    questionTypeSlugs,
    materialType: "standard-expression",
    previousDueAt: null,
    nextDueAt: "2026-05-29T08:00:00.000Z",
    previousIntervalDays: 0,
    nextIntervalDays: 1,
    previousEase: 2.5,
    nextEase: 2.5,
    elapsedMs,
    answerRevealedAt: "2026-05-28T07:59:00.000Z",
    note: "",
  };
}
