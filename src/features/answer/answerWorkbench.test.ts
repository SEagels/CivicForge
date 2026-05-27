import { describe, expect, it } from "vitest";
import { createDefaultReviewSchedule } from "../review/reviewScheduler";
import type { MaterialDraft } from "../materials/materialModel";
import {
  buildRewriteDraftFromAnswerDraft,
  buildMaterialInputFromAnswerDraft,
  createStructuredAnswerDraft,
  getAnswerTemplate,
  getAnswerSlots,
  groupCallableMaterials,
  insertMaterialIntoDraft,
  insertMaterialIntoSlot,
  rankCallableMaterials,
  renderStructuredDraftToMarkdown,
  type AnswerWorkbenchStructuredDraft,
  type AnswerWorkbenchDraft,
} from "./answerWorkbench";

const baseMaterial = (patch: Partial<MaterialDraft>): MaterialDraft => ({
  id: patch.id ?? "mat-test",
  title: patch.title ?? "基层治理规范表达",
  contentMd: patch.contentMd ?? "推动治理资源下沉基层，提升联系群众、服务群众、组织群众的能力。",
  excerpt: patch.excerpt ?? "推动治理资源下沉基层。",
  materialType: patch.materialType ?? "standard-expression",
  topicSlug: patch.topicSlug ?? "grassroots-governance",
  tagNames: patch.tagNames ?? ["基层治理", "规范表达"],
  questionTypeSlugs: patch.questionTypeSlugs ?? ["countermeasure"],
  source: patch.source ?? "半月谈",
  status: patch.status ?? "active",
  favorite: patch.favorite ?? false,
  reviewEnabled: patch.reviewEnabled ?? false,
  ...createDefaultReviewSchedule(),
  ...patch,
  updatedAt: patch.updatedAt ?? "2026-05-26T08:00:00.000Z",
});

describe("answer workbench", () => {
  it("ranks confirmed high-quality materials that match topic and question type first", () => {
    const best = baseMaterial({
      id: "best",
      title: "基层治理：网格服务提质",
      materialType: "solution",
      favorite: true,
      reviewEnabled: true,
    });
    const weakDraft = baseMaterial({
      id: "weak-draft",
      title: "基层治理：待加工表达",
      source: "",
      tagNames: [],
      status: "draft",
    });
    const otherTopic = baseMaterial({
      id: "other-topic",
      title: "数字政府：数据跑路",
      topicSlug: "digital-government",
      questionTypeSlugs: ["implementation"],
    });

    const ranked = rankCallableMaterials([weakDraft, otherTopic, best], {
      topicSlug: "grassroots-governance",
      questionTypeSlug: "countermeasure",
      goalId: "build-answer",
      keyword: "网格",
    });

    expect(ranked.map((item) => item.material.id)).toEqual(["best", "weak-draft", "other-topic"]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].reasons).toContain("主题匹配");
    expect(ranked[0].reasons).toContain("题型匹配");
  });

  it("groups callable materials by essay material type in writing order", () => {
    const materials = [
      baseMaterial({ id: "argument", materialType: "argument", title: "分论点" }),
      baseMaterial({ id: "problem", materialType: "problem", title: "问题" }),
      baseMaterial({ id: "case", materialType: "case", title: "案例" }),
    ];

    const groups = groupCallableMaterials(materials);

    expect(groups.map((group) => group.materialType)).toEqual(["problem", "case", "argument"]);
    expect(groups.find((group) => group.materialType === "case")?.label).toBe("案例");
  });

  it("returns answer templates for core question types", () => {
    expect(getAnswerTemplate("summary").sections.map((section) => section.title)).toEqual([
      "总括句",
      "分点概括",
      "规范收束",
    ]);
    expect(getAnswerTemplate("countermeasure").sections.map((section) => section.title)).toEqual([
      "问题定位",
      "对策分条",
      "执行主体",
    ]);
    expect(getAnswerTemplate("essay").sections.map((section) => section.title)).toEqual([
      "标题",
      "开头",
      "分论点",
      "论证素材",
      "结尾",
    ]);
  });

  it("inserts selected material into a markdown draft with a reusable format", () => {
    const draft: AnswerWorkbenchDraft = {
      topicSlug: "grassroots-governance",
      questionTypeSlug: "countermeasure",
      goalId: "build-answer",
      keyword: "网格",
      contentMd: "## 草稿\n",
    };
    const material = baseMaterial({
      title: "基层治理：网格服务",
      excerpt: "把服务触角延伸到群众身边。",
      contentMd: "推动网格服务提质增效。",
    });

    const next = insertMaterialIntoDraft(draft, material, "excerpt");

    expect(next.contentMd).toContain("### 基层治理：网格服务");
    expect(next.contentMd).toContain("> 把服务触角延伸到群众身边。");
    expect(next.contentMd).not.toContain("推动网格服务提质增效。");
  });

  it("builds a material input from answer draft with topic and question metadata", () => {
    const draft: AnswerWorkbenchDraft = {
      topicSlug: "grassroots-governance",
      questionTypeSlug: "countermeasure",
      goalId: "build-answer",
      keyword: "网格",
      contentMd: "## 对策\n推动治理资源下沉基层。",
    };

    const input = buildMaterialInputFromAnswerDraft(draft, new Date("2026-05-27T09:00:00.000Z"));

    expect(input).toMatchObject({
      title: "调用练习：基层治理 + 提出对策 + 2026-05-27",
      contentMd: "## 对策\n推动治理资源下沉基层。",
      excerpt: "推动治理资源下沉基层。",
      materialType: "solution",
      topicSlug: "grassroots-governance",
      questionTypeSlugs: ["countermeasure"],
      source: "调用工作台",
      tagNames: ["调用工作台", "基层治理", "提出对策"],
    });
  });

  it("returns fixed writing slots for countermeasure and essay question types", () => {
    expect(getAnswerSlots("countermeasure").map((slot) => slot.title)).toEqual([
      "问题定位",
      "对策一",
      "对策二",
      "执行主体",
      "收束句",
    ]);
    expect(getAnswerSlots("essay").map((slot) => slot.title)).toEqual([
      "标题",
      "开头",
      "分论点一",
      "分论点二",
      "论证素材",
      "结尾",
    ]);
  });

  it("creates a structured draft with slots for the selected question type", () => {
    const draft = createStructuredAnswerDraft({
      topicSlug: "grassroots-governance",
      questionTypeSlug: "countermeasure",
      goalId: "build-answer",
      keyword: "网格",
    });

    expect(draft.slots.map((slot) => [slot.id, slot.title, slot.contentMd])).toEqual([
      ["problem", "问题定位", ""],
      ["measure-1", "对策一", ""],
      ["measure-2", "对策二", ""],
      ["owner", "执行主体", ""],
      ["closing", "收束句", ""],
    ]);
  });

  it("inserts selected material into a specific structured draft slot", () => {
    const draft = createStructuredAnswerDraft({
      topicSlug: "grassroots-governance",
      questionTypeSlug: "countermeasure",
      goalId: "build-answer",
      keyword: "网格",
    });
    const material = baseMaterial({
      title: "基层治理：网格服务",
      excerpt: "把服务触角延伸到群众身边。",
      contentMd: "推动网格服务提质增效。",
    });

    const next = insertMaterialIntoSlot(draft, "measure-1", material, "excerpt");

    expect(next.slots.find((slot) => slot.id === "measure-1")?.contentMd).toBe(
      "### 基层治理：网格服务\n> 把服务触角延伸到群众身边。",
    );
    expect(next.slots.find((slot) => slot.id === "measure-2")?.contentMd).toBe("");
  });

  it("renders structured draft slots to a stable markdown summary", () => {
    const draft: AnswerWorkbenchStructuredDraft = {
      topicSlug: "grassroots-governance",
      questionTypeSlug: "countermeasure",
      goalId: "build-answer",
      keyword: "网格",
      activeSlotId: "measure-1",
      slots: [
        { id: "problem", title: "问题定位", hint: "定位问题", contentMd: "基层服务触角还需前移。" },
        { id: "measure-1", title: "对策一", hint: "第一条对策", contentMd: "推动治理资源下沉网格。" },
        { id: "measure-2", title: "对策二", hint: "第二条对策", contentMd: "" },
      ],
    };

    expect(renderStructuredDraftToMarkdown(draft)).toBe(
      "## 问题定位\n基层服务触角还需前移。\n\n## 对策一\n推动治理资源下沉网格。",
    );
  });

  it("builds material input from structured draft using rendered markdown", () => {
    const draft = insertMaterialIntoSlot(
      createStructuredAnswerDraft({
        topicSlug: "grassroots-governance",
        questionTypeSlug: "countermeasure",
        goalId: "build-answer",
        keyword: "网格",
      }),
      "measure-1",
      baseMaterial({ title: "基层治理：网格服务", excerpt: "推动治理资源下沉基层。" }),
      "excerpt",
    );

    const input = buildMaterialInputFromAnswerDraft(draft, new Date("2026-05-27T09:00:00.000Z"));

    expect(input).toMatchObject({
      title: "调用练习：基层治理 + 提出对策 + 2026-05-27",
      materialType: "solution",
      contentMd: "## 对策一\n### 基层治理：网格服务\n> 推动治理资源下沉基层。",
      excerpt: "推动治理资源下沉基层。",
    });
  });

  it("builds a Rewrite draft from structured answer draft with question-aware default target", () => {
    const countermeasureDraft = insertMaterialIntoSlot(
      createStructuredAnswerDraft({
        topicSlug: "grassroots-governance",
        questionTypeSlug: "countermeasure",
        goalId: "build-answer",
        keyword: "",
      }),
      "problem",
      baseMaterial({ excerpt: "基层治理需要补齐服务短板。" }),
      "excerpt",
    );
    const essayDraft = createStructuredAnswerDraft({
      topicSlug: "grassroots-governance",
      questionTypeSlug: "essay",
      goalId: "build-answer",
      keyword: "",
    });

    expect(buildRewriteDraftFromAnswerDraft(countermeasureDraft)).toMatchObject({
      sourceMaterialId: "",
      targetId: "compress",
      originalText: "## 问题定位\n### 基层治理规范表达\n> 基层治理需要补齐服务短板。",
      resultText: "",
    });
    expect(buildRewriteDraftFromAnswerDraft(essayDraft).targetId).toBe("expand_argument");
  });
});
