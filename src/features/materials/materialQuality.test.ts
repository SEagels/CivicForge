import { describe, expect, it } from "vitest";
import type { MaterialDraft } from "./materialModel";
import { getMaterialQualityReport, getPotentialDuplicateMaterials } from "./materialQuality";

describe("material quality", () => {
  it("approves a sourced, classified, reusable material for review", () => {
    const report = getMaterialQualityReport(makeMaterial());

    expect(report.score).toBeGreaterThanOrEqual(70);
    expect(report.level).toBe("approved");
    expect(report.reviewAllowed).toBe(true);
    expect(report.failedRequiredChecks).toEqual([]);
  });

  it("keeps model-only rewrite output in refining until it has a credible source and specific question type", () => {
    const report = getMaterialQualityReport(
      makeMaterial({
        source: "Rewrite 工坊",
        questionTypeSlugs: ["general"],
        tagNames: ["Rewrite"],
      }),
    );

    expect(report.score).toBeLessThan(70);
    expect(report.level).toBe("refining");
    expect(report.reviewAllowed).toBe(false);
    expect(report.failedRequiredChecks).toEqual(
      expect.arrayContaining(["credible-source", "specific-question-type"]),
    );
  });

  it("keeps high-scoring source candidates in refining while required checks are missing", () => {
    const report = getMaterialQualityReport(
      makeMaterial({
        source: "国务院",
        questionTypeSlugs: ["general"],
      }),
    );

    expect(report.score).toBeGreaterThanOrEqual(70);
    expect(report.level).toBe("refining");
    expect(report.reviewAllowed).toBe(false);
    expect(report.failedRequiredChecks).toEqual(["specific-question-type"]);
  });

  it("marks empty drafts as candidates that cannot enter review", () => {
    const report = getMaterialQualityReport(
      makeMaterial({
        title: "未命名素材",
        contentMd: "",
        excerpt: "",
        source: "",
        tagNames: [],
        questionTypeSlugs: ["general"],
      }),
    );

    expect(report.score).toBeLessThan(40);
    expect(report.level).toBe("candidate");
    expect(report.reviewAllowed).toBe(false);
    expect(report.failedRequiredChecks).toEqual(
      expect.arrayContaining(["title", "content", "credible-source", "tags", "specific-question-type"]),
    );
  });

  it("detects likely duplicate materials by normalized title and content overlap", () => {
    const current = makeMaterial({ id: "current", title: "基层治理：网格服务", contentMd: "推动治理资源下沉网格，提升基层服务效能。" });
    const duplicateByTitle = makeMaterial({ id: "same-title", title: " 基层治理：网格服务 " });
    const duplicateByContent = makeMaterial({ id: "same-content", title: "另一条", contentMd: "推动治理资源下沉网格，提升基层服务效能。" });
    const unrelated = makeMaterial({ id: "other", title: "数字政府", contentMd: "推动政务服务一网通办。" });

    expect(getPotentialDuplicateMaterials(current, [current, unrelated, duplicateByContent, duplicateByTitle])).toEqual([
      duplicateByContent,
      duplicateByTitle,
    ]);
  });
});

function makeMaterial(patch: Partial<MaterialDraft> = {}): MaterialDraft {
  return {
    id: "mat-quality",
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
