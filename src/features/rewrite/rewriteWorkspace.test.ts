import { describe, expect, it } from "vitest";
import {
  createManualTemplateProvider,
  filterRewriteLogs,
  getRewriteDraftFromLog,
  getRewriteMetrics,
  getRewritePromptCopyStatus,
  type RewriteModelProvider,
} from "./rewriteWorkspace";
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
