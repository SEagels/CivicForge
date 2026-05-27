import { describe, expect, it } from "vitest";
import {
  createManualTemplateProvider,
  filterRewriteLogs,
  getRewriteDraftFromMaterial,
  getRewriteDraftFromLog,
  getRewriteMetrics,
  getRewritePromptCopyStatus,
  type RewriteModelProvider,
} from "./rewriteWorkspace";
import type { MaterialDraft } from "../materials/materialModel";
import type { RewriteLog } from "./rewriteWorkshop";

describe("rewrite workspace helpers", () => {
  it("calculates original/result character counts and change ratio", () => {
    expect(getRewriteMetrics(" 基层治理 要 精细化 ", "基层治理要精细化、精准化。")).toEqual({
      originalCount: 8,
      resultCount: 13,
      deltaCount: 5,
      ratio: 1.63,
      direction: "expanded",
    });
  });

  it("marks unchanged and empty results without dividing by zero", () => {
    expect(getRewriteMetrics("", "")).toEqual({
      originalCount: 0,
      resultCount: 0,
      deltaCount: 0,
      ratio: 0,
      direction: "unchanged",
    });
  });

  it("filters rewrite logs by target while preserving all logs for the all filter", () => {
    const logs = [createLog("a", "compress"), createLog("b", "title"), createLog("c", "compress")];

    expect(filterRewriteLogs(logs, "all").map((log) => log.id)).toEqual(["a", "b", "c"]);
    expect(filterRewriteLogs(logs, "compress").map((log) => log.id)).toEqual(["a", "c"]);
    expect(filterRewriteLogs(logs, "opening")).toEqual([]);
  });

  it("restores an editable draft from a rewrite log", () => {
    expect(getRewriteDraftFromLog(createLog("draft", "ending"))).toEqual({
      sourceMaterialId: "material-1",
      targetId: "ending",
      originalText: "原文 draft",
      resultText: "结果 draft",
      extraInstruction: "",
    });
  });

  it("creates an editable rewrite draft from a source material", () => {
    expect(getRewriteDraftFromMaterial(createMaterial())).toEqual({
      sourceMaterialId: "material-1",
      targetId: "compress",
      originalText: "基层治理正文",
      resultText: "",
      extraInstruction: "请保留来源信息，先提炼为可复用申论表达。",
    });
  });

  it("formats prompt copy status labels", () => {
    expect(getRewritePromptCopyStatus("idle")).toBe("复制提示词");
    expect(getRewritePromptCopyStatus("copied")).toBe("已复制");
    expect(getRewritePromptCopyStatus("failed")).toBe("复制失败");
  });

  it("defines a manual template provider that never calls a model", async () => {
    const provider: RewriteModelProvider = createManualTemplateProvider();

    await expect(provider.rewrite({ promptTemplate: "提示词" })).resolves.toEqual({
      ok: false,
      reason: "manual-template",
      message: "当前为本地模板模式：请复制提示词到外部模型，或手动填写改写结果。",
    });
  });
});

function createLog(id: string, targetId: RewriteLog["targetId"]): RewriteLog {
  return {
    id,
    sourceMaterialId: "material-1",
    targetId,
    originalText: `原文 ${id}`,
    promptTemplate: `提示 ${id}`,
    resultText: `结果 ${id}`,
    status: "saved",
    createdAt: "2026-05-26T08:00:00.000Z",
    updatedAt: "2026-05-26T08:00:00.000Z",
  };
}

function createMaterial(): MaterialDraft {
  return {
    id: "material-1",
    title: "基层治理素材",
    contentMd: "基层治理正文",
    excerpt: "基层治理摘要",
    materialType: "standard-expression",
    topicSlug: "grassroots-governance",
    tagNames: ["基层服务"],
    questionTypeSlugs: ["general"],
    source: "国务院",
    status: "draft",
    favorite: false,
    reviewEnabled: false,
    reviewEase: 2.5,
    reviewIntervalDays: 0,
    reviewRepetitions: 0,
    reviewLapses: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    updatedAt: "2026-05-22T08:00:00.000Z",
  };
}
