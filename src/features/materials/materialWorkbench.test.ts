import { describe, expect, it } from "vitest";
import type { MaterialDraft } from "./materialModel";
import {
  getMaterialWorkbenchStatus,
  getWorkbenchCandidates,
  isWorkbenchCandidate,
} from "./materialWorkbench";

describe("material workbench", () => {
  it("keeps imported source drafts in the workbench until classification is specific enough", () => {
    const candidate = makeMaterial({
      id: "source-candidate",
      title: "资料：推进基层治理现代化",
      source: "国务院",
      status: "draft",
      tagNames: ["资料导入"],
      questionTypeSlugs: ["general"],
      reviewEnabled: false,
    });

    expect(isWorkbenchCandidate(candidate)).toBe(true);
    expect(getMaterialWorkbenchStatus(candidate)).toMatchObject({
      stage: "refining",
      primaryStep: "classify",
      actionLabel: "补齐分类",
      reviewAllowed: false,
    });
  });

  it("keeps approved but review-disabled materials in the workbench as ready to add to review", () => {
    const ready = makeMaterial({ reviewEnabled: false });

    expect(isWorkbenchCandidate(ready)).toBe(true);
    expect(getMaterialWorkbenchStatus(ready)).toMatchObject({
      stage: "ready",
      primaryStep: "review",
      actionLabel: "加入复习",
      reviewAllowed: true,
    });
  });

  it("excludes archived and already review-enabled materials from the workbench queue", () => {
    const materials = [
      makeMaterial({ id: "review-ready", reviewEnabled: true }),
      makeMaterial({ id: "archived", status: "archived", reviewEnabled: false }),
      makeMaterial({ id: "needs-work", contentMd: "", excerpt: "", reviewEnabled: false }),
    ];

    expect(getWorkbenchCandidates(materials).map((material) => material.id)).toEqual(["needs-work"]);
  });
});

function makeMaterial(patch: Partial<MaterialDraft> = {}): MaterialDraft {
  return {
    id: "mat-workbench",
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
