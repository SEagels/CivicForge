import { describe, expect, it } from "vitest";
import {
  archiveSelectedMaterial,
  createInitialMaterialState,
  createMaterial,
  createMaterialFromAnswerDraft,
  confirmSelectedMaterial,
  createMaterialFromSource,
  createMaterialFromRewrite,
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
    expect(selected?.reviewEnabled).toBe(false);
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
      status: "draft",
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

  it("does not enable review for low quality material", () => {
    const state = createMaterial(createInitialMaterialState());
    const updated = updateSelectedMaterial(state, {
      title: "一句话",
      contentMd: "内容太短",
      reviewEnabled: true,
    });
    const selected = updated.materials.find((material) => material.id === updated.selectedId);

    expect(selected?.reviewEnabled).toBe(false);
  });

  it("keeps review disabled until a qualified draft is explicitly confirmed into the library", () => {
    const state = createMaterial(createInitialMaterialState());
    const updated = updateSelectedMaterial(state, {
      title: "基层治理：网格化服务",
      contentMd: "推动治理资源下沉网格，把服务触角延伸到群众身边，提升基层治理效能。",
      excerpt: "治理资源下沉网格，服务触角前移。",
      source: "政策材料",
      tagNames: ["网格化", "基层服务"],
      questionTypeSlugs: ["implementation", "essay"],
      reviewEnabled: true,
    });
    const selected = updated.materials.find((material) => material.id === updated.selectedId);

    expect(selected).toMatchObject({
      status: "draft",
      reviewEnabled: false,
    });
  });

  it("confirms a qualified draft into the library before review can be enabled", () => {
    const draft = updateSelectedMaterial(createMaterial(createInitialMaterialState()), {
      title: "基层治理：网格化服务",
      contentMd: "推动治理资源下沉网格，把服务触角延伸到群众身边，提升基层治理效能。",
      excerpt: "治理资源下沉网格，服务触角前移。",
      source: "政策材料",
      tagNames: ["网格化", "基层服务"],
      questionTypeSlugs: ["implementation", "essay"],
      reviewEnabled: true,
    });
    const confirmed = confirmSelectedMaterial(draft);
    const enabled = updateSelectedMaterial(confirmed, { reviewEnabled: true });
    const selected = enabled.materials.find((material) => material.id === enabled.selectedId);

    expect(selected).toMatchObject({
      status: "active",
      reviewEnabled: true,
    });
  });

  it("creates and selects a material from rewrite output", () => {
    const state = createInitialMaterialState();
    const next = createMaterialFromRewrite(state, {
      title: "Rewrite：改成标题句",
      contentMd: "以精细治理托举群众幸福",
      excerpt: "以精细治理托举群众幸福",
      materialType: "title-sentence",
      source: "Rewrite 工坊",
      tagNames: ["Rewrite"],
    });
    const selected = next.materials.find((material) => material.id === next.selectedId);

    expect(next.materials).toHaveLength(4);
    expect(selected).toMatchObject({
      title: "Rewrite：改成标题句",
      contentMd: "以精细治理托举群众幸福",
      excerpt: "以精细治理托举群众幸福",
      materialType: "title-sentence",
      source: "Rewrite 工坊",
      tagNames: ["Rewrite"],
      status: "draft",
      reviewEnabled: false,
    });
  });

  it("creates a draft candidate material from an imported source", () => {
    const state = createInitialMaterialState();
    const next = createMaterialFromSource(state, {
      title: "资料：推进基层治理现代化",
      contentMd: "推动治理资源下沉基层，提升服务群众能力。",
      excerpt: "推动治理资源下沉基层，提升服务群众能力。",
      materialType: "standard-expression",
      source: "国务院",
      tagNames: ["资料导入"],
    });
    const selected = next.materials.find((material) => material.id === next.selectedId);

    expect(selected).toMatchObject({
      title: "资料：推进基层治理现代化",
      source: "国务院",
      tagNames: ["资料导入"],
      status: "draft",
      reviewEnabled: false,
      questionTypeSlugs: ["general"],
    });
  });

  it("creates and selects a material from answer workbench draft", () => {
    const state = createInitialMaterialState();
    const next = createMaterialFromAnswerDraft(state, {
      title: "调用练习：基层治理 + 提出对策 + 2026-05-27",
      contentMd: "## 对策\n推动治理资源下沉基层。",
      excerpt: "推动治理资源下沉基层。",
      materialType: "solution",
      topicSlug: "grassroots-governance",
      questionTypeSlugs: ["countermeasure"],
      source: "调用工作台",
      tagNames: ["调用工作台", "基层治理", "提出对策"],
    });
    const selected = next.materials.find((material) => material.id === next.selectedId);

    expect(selected).toMatchObject({
      title: "调用练习：基层治理 + 提出对策 + 2026-05-27",
      materialType: "solution",
      topicSlug: "grassroots-governance",
      questionTypeSlugs: ["countermeasure"],
      source: "调用工作台",
      tagNames: ["调用工作台", "基层治理", "提出对策"],
      status: "draft",
      reviewEnabled: false,
    });
  });
});
