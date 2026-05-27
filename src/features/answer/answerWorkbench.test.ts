import { describe, expect, it } from "vitest";
import { createDefaultReviewSchedule } from "../review/reviewScheduler";
import type { MaterialDraft } from "../materials/materialModel";
import {
  buildMaterialInputFromAnswerDraft,
  getAnswerTemplate,
  groupCallableMaterials,
  insertMaterialIntoDraft,
  rankCallableMaterials,
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
});
