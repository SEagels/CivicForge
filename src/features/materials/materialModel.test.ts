import { describe, expect, it } from "vitest";
import {
  archiveSelectedMaterial,
  createInitialMaterialState,
  createMaterial,
  getActiveMaterials,
  reviewMaterial,
  selectMaterial,
  updateSelectedMaterial,
} from "./materialModel";

describe("material model", () => {
  it("starts with a selected active material", () => {
    const state = createInitialMaterialState();

    expect(state.selectedId).toBeTruthy();
    expect(getActiveMaterials(state)).toHaveLength(3);
    expect(getActiveMaterials(state)[0].title).toBe("基层治理：小事不出网格");
  });

  it("creates a new draft material and selects it", () => {
    const state = createMaterial(createInitialMaterialState());
    const selected = state.materials.find((material) => material.id === state.selectedId);

    expect(selected?.title).toBe("未命名素材");
    expect(selected?.status).toBe("draft");
    expect(selected?.materialType).toBe("standard-expression");
    expect(selected?.reviewEnabled).toBe(true);
    expect(selected).toMatchObject({
      reviewEase: 2.5,
      reviewIntervalDays: 0,
      reviewRepetitions: 0,
      reviewLapses: 0,
      nextReviewAt: null,
      lastReviewedAt: null,
    });
  });

  it("updates the selected material content and metadata", () => {
    const state = createMaterial(createInitialMaterialState());
    const updated = updateSelectedMaterial(state, {
      title: "数字政府规范表达",
      contentMd: "让数据多跑路、群众少跑腿。",
      topicSlug: "digital-government",
      questionTypeSlugs: ["implementation", "essay"],
      reviewEnabled: false,
    });
    const selected = updated.materials.find((material) => material.id === updated.selectedId);

    expect(selected).toMatchObject({
      title: "数字政府规范表达",
      contentMd: "让数据多跑路、群众少跑腿。",
      topicSlug: "digital-government",
      questionTypeSlugs: ["implementation", "essay"],
      reviewEnabled: false,
    });
  });

  it("selects an existing material without changing the list", () => {
    const state = createInitialMaterialState();
    const targetId = state.materials[1].id;

    const selected = selectMaterial(state, targetId);

    expect(selected.selectedId).toBe(targetId);
    expect(selected.materials).toEqual(state.materials);
  });

  it("archives the selected material and moves selection to another active material", () => {
    const state = createInitialMaterialState();
    const archivedId = state.selectedId;

    const archived = archiveSelectedMaterial(state);

    expect(archived.materials.find((material) => material.id === archivedId)?.status).toBe("archived");
    expect(archived.selectedId).not.toBe(archivedId);
    expect(getActiveMaterials(archived).every((material) => material.status === "active")).toBe(true);
  });

  it("applies a review rating to a material by id", () => {
    const state = createInitialMaterialState();
    const reviewed = reviewMaterial(state, "mat-grid-governance", "good", new Date("2026-05-23T08:00:00.000Z"));
    const material = reviewed.materials.find((item) => item.id === "mat-grid-governance");

    expect(material).toMatchObject({
      reviewIntervalDays: 1,
      reviewRepetitions: 1,
      reviewLapses: 0,
      nextReviewAt: "2026-05-24T08:00:00.000Z",
      lastReviewedAt: "2026-05-23T08:00:00.000Z",
    });
  });
});
