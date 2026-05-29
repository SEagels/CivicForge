import { describe, expect, it } from "vitest";
import type { MaterialDraft } from "./materialModel";
import {
  buildIntakeChecklist,
  buildPatchFromIntakeSuggestion,
  getNextIntakeMaterialId,
  suggestIntakeMetadata,
} from "./intakeAssistant";

describe("intake assistant", () => {
  it("builds required checklist items for a candidate material", () => {
    const checklist = buildIntakeChecklist(
      makeMaterial({
        title: "未命名素材",
        contentMd: "",
        excerpt: "",
        source: "",
        tagNames: [],
        questionTypeSlugs: ["general"],
      }),
    );

    expect(checklist.map((item) => [item.id, item.passed])).toEqual([
      ["title", false],
      ["content", false],
      ["credible-source", false],
      ["tags", false],
      ["specific-question-type", false],
    ]);
  });

  it("suggests local metadata from essay keywords without calling external services", () => {
    const suggestions = suggestIntakeMetadata(
      makeMaterial({
        title: "数字政府：一网通办提升政务服务效能",
        contentMd: "推进政务服务一网通办、跨域通办，让数据多跑路、群众少跑腿。",
        source: "国务院",
        tagNames: ["资料导入"],
        questionTypeSlugs: ["general"],
      }),
    );

    expect(suggestions.topicSlug).toBe("digital-government");
    expect(suggestions.materialType).toBe("solution");
    expect(suggestions.questionTypeSlugs).toEqual(expect.arrayContaining(["countermeasure", "implementation"]));
    expect(suggestions.tagNames).toEqual(expect.arrayContaining(["数字政府", "政务服务", "数据治理"]));
    expect(suggestions.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "questionTypeSlugs",
          valueLabel: "提出对策 / 贯彻执行",
        }),
      ]),
    );
    expect(suggestions.suggestions.length).toBeGreaterThan(0);
  });

  it("builds a patch that preserves existing user classification and extends tags", () => {
    const material = makeMaterial({
      materialType: "case",
      topicSlug: "public-services",
      questionTypeSlugs: ["analysis"],
      tagNames: ["养老服务"],
    });
    const patch = buildPatchFromIntakeSuggestion(material, {
      topicSlug: "digital-government",
      materialType: "solution",
      questionTypeSlugs: ["countermeasure"],
      tagNames: ["政务服务", "养老服务"],
      suggestions: [],
    });

    expect(patch).toEqual({
      questionTypeSlugs: ["analysis", "countermeasure"],
      tagNames: ["养老服务", "政务服务"],
    });
  });

  it("finds the next workbench candidate in order and wraps once", () => {
    const done = makeMaterial({ id: "done", status: "active", reviewEnabled: true });
    const first = makeMaterial({ id: "first", contentMd: "", excerpt: "", source: "", tagNames: [], reviewEnabled: false });
    const second = makeMaterial({ id: "second", questionTypeSlugs: ["general"], reviewEnabled: false });
    const third = makeMaterial({ id: "third", status: "draft", reviewEnabled: false });

    expect(getNextIntakeMaterialId([done, first, second, third], "first")).toBe("second");
    expect(getNextIntakeMaterialId([done, first, second, third], "third")).toBe("first");
    expect(getNextIntakeMaterialId([done], "done")).toBeNull();
  });
});

function makeMaterial(patch: Partial<MaterialDraft> = {}): MaterialDraft {
  return {
    id: "mat-intake",
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
