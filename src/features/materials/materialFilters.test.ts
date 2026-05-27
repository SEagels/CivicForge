import { describe, expect, it } from "vitest";
import { createInitialMaterialState, getActiveMaterials } from "./materialModel";
import type { MaterialDraft } from "./materialModel";
import {
  DEFAULT_MATERIAL_FILTERS,
  filterMaterials,
  getAvailableTags,
  hasActiveFilters,
} from "./materialFilters";

const materials = getActiveMaterials(createInitialMaterialState());

describe("material filters", () => {
  it("matches keyword across title, body, excerpt, source, tags, and taxonomy names", () => {
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, query: "数字政府" })).toHaveLength(1);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, query: "流程再造" })).toHaveLength(1);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, query: "政策材料" })).toHaveLength(1);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, query: "网格化" })).toHaveLength(1);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, query: "申发论述" })).toHaveLength(2);
  });

  it("filters by topic, material type, question type, and tag", () => {
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, topicSlug: "rural-revitalization" })).toHaveLength(1);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, materialType: "solution" })).toHaveLength(1);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, questionTypeSlug: "implementation" })).toHaveLength(2);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, tagName: "共同富裕" })).toHaveLength(1);
  });

  it("filters favorites and review-enabled materials", () => {
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, favoriteOnly: true })).toHaveLength(1);
    expect(filterMaterials(materials, { ...DEFAULT_MATERIAL_FILTERS, reviewOnly: true })).toHaveLength(3);
  });

  it("filters materials that still need workbench attention", () => {
    const candidate = {
      ...materials[0],
      id: "source-candidate",
      title: "资料：基层治理来源",
      questionTypeSlugs: ["general"],
      reviewEnabled: false,
      status: "draft" as const,
    };

    expect(filterMaterials([...materials, candidate], { ...DEFAULT_MATERIAL_FILTERS, workbenchOnly: true })).toEqual([
      candidate,
    ]);
  });

  it("filters workbench materials by the next step that needs attention", () => {
    const workbenchMaterials = [
      makeMaterial("candidate", {
        title: "短",
        contentMd: "",
        excerpt: "",
        source: "",
        tagNames: [],
        questionTypeSlugs: ["general"],
        reviewEnabled: false,
      }),
      makeMaterial("classify", { questionTypeSlugs: ["general"], reviewEnabled: false }),
      makeMaterial("intake", { status: "draft", reviewEnabled: false }),
      makeMaterial("review", { status: "active", reviewEnabled: false }),
      makeMaterial("done", { status: "active", reviewEnabled: true }),
    ];

    expect(
      filterMaterials(workbenchMaterials, {
        ...DEFAULT_MATERIAL_FILTERS,
        workbenchOnly: true,
        workbenchStep: "candidate",
      }).map((material) => material.id),
    ).toEqual(["candidate"]);
    expect(
      filterMaterials(workbenchMaterials, {
        ...DEFAULT_MATERIAL_FILTERS,
        workbenchOnly: true,
        workbenchStep: "classify",
      }).map((material) => material.id),
    ).toEqual(["classify"]);
    expect(
      filterMaterials(workbenchMaterials, {
        ...DEFAULT_MATERIAL_FILTERS,
        workbenchOnly: true,
        workbenchStep: "intake",
      }).map((material) => material.id),
    ).toEqual(["intake"]);
    expect(
      filterMaterials(workbenchMaterials, {
        ...DEFAULT_MATERIAL_FILTERS,
        workbenchOnly: true,
        workbenchStep: "review",
      }).map((material) => material.id),
    ).toEqual(["review"]);
  });

  it("sorts available tags by Chinese locale", () => {
    expect(getAvailableTags(materials)).toEqual([
      "产业振兴",
      "共同富裕",
      "基层服务",
      "流程再造",
      "网格化",
      "政务服务",
    ]);
  });

  it("detects active filters", () => {
    expect(hasActiveFilters(DEFAULT_MATERIAL_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_MATERIAL_FILTERS, query: "治理" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_MATERIAL_FILTERS, favoriteOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_MATERIAL_FILTERS, workbenchOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_MATERIAL_FILTERS, workbenchStep: "review" })).toBe(true);
  });
});

function makeMaterial(id: string, patch: Partial<MaterialDraft> = {}): MaterialDraft {
  return {
    id,
    title: "基层治理：网格化服务",
    contentMd: "推动治理资源下沉网格，把服务触角延伸到群众身边，提升基层治理效能。",
    excerpt: "治理资源下沉网格，服务触角前移。",
    materialType: "standard-expression",
    topicSlug: "grassroots-governance",
    tagNames: ["网格化", "基层服务"],
    questionTypeSlugs: ["implementation", "essay"],
    source: "政策材料",
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
