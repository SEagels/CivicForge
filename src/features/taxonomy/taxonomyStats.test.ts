import { describe, expect, it } from "vitest";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import { createInitialMaterialState, type MaterialDraft } from "../materials/materialModel";
import { getDashboardStats, getMaterialTypeStats, getQuestionTypeStats, getTagStats, getTopicStats } from "./taxonomyStats";

describe("taxonomy stats", () => {
  it("summarizes dashboard counts for active materials, reviews, favorites, rewrites, and tags", () => {
    const now = new Date("2026-05-23T09:00:00.000Z");
    const state = createInitialMaterialState();
    const materials: readonly MaterialDraft[] = [
      {
        ...state.materials[0],
        nextReviewAt: "2026-05-23T08:00:00.000Z",
      },
      {
        ...state.materials[1],
        favorite: true,
        nextReviewAt: "2026-05-24T08:00:00.000Z",
      },
      {
        ...state.materials[2],
        reviewEnabled: false,
        tagNames: ["alpha", "beta", "alpha"],
      },
      {
        ...state.materials[0],
        id: "archived-material",
        status: "archived",
        tagNames: ["archived-only"],
      },
    ];

    expect(getDashboardStats(materials, 2, now)).toEqual({
      activeCount: 3,
      archivedCount: 1,
      dueReviewCount: 1,
      favoriteCount: 2,
      reviewEnabledCount: 2,
      rewriteLogCount: 2,
      tagCount: 6,
      totalCount: 4,
    });
  });

  it("returns built-in topic counts even when a topic has no materials", () => {
    const state = createInitialMaterialState();
    const stats = getTopicStats(state.materials);

    expect(stats).toHaveLength(BUILTIN_TOPICS.length);
    expect(stats.find((item) => item.id === "grassroots-governance")?.count).toBe(1);
    expect(stats.find((item) => item.id === "common-prosperity")?.count).toBe(0);
  });

  it("returns built-in material type counts in configured order", () => {
    const state = createInitialMaterialState();
    const stats = getMaterialTypeStats(state.materials);

    expect(stats.map((item) => item.id)).toEqual(BUILTIN_MATERIAL_TYPES.map((item) => item.id));
    expect(stats.find((item) => item.id === "standard-expression")?.count).toBe(1);
    expect(stats.find((item) => item.id === "case")?.count).toBe(1);
  });

  it("returns built-in question type coverage counts", () => {
    const state = createInitialMaterialState();
    const stats = getQuestionTypeStats(state.materials);

    expect(stats.map((item) => item.id)).toEqual(BUILTIN_QUESTION_TYPES.map((item) => item.slug));
    expect(stats.find((item) => item.id === "implementation")?.count).toBe(2);
    expect(stats.find((item) => item.id === "general")?.count).toBe(0);
  });

  it("deduplicates and sorts tag counts by name", () => {
    const state = createInitialMaterialState();
    const materials = [
      { ...state.materials[0], tagNames: ["beta", "alpha", "alpha"] },
      { ...state.materials[1], tagNames: ["Beta", "gamma"] },
    ];

    expect(getTagStats(materials)).toEqual([
      { id: "alpha", name: "alpha", count: 1 },
      { id: "Beta", name: "Beta", count: 1 },
      { id: "beta", name: "beta", count: 1 },
      { id: "gamma", name: "gamma", count: 1 },
    ]);
  });
});
