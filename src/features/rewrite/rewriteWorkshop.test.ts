import { describe, expect, it } from "vitest";
import {
  REWRITE_TARGETS,
  buildMaterialInputFromRewrite,
  createRewriteLog,
  generateRewritePrompt,
  getRewriteTarget,
} from "./rewriteWorkshop";

describe("rewrite workshop", () => {
  it("defines every required rewrite target in a stable order", () => {
    expect(REWRITE_TARGETS.map((target) => target.id)).toEqual([
      "compress",
      "expand_argument",
      "opening",
      "ending",
      "transition",
      "title",
      "free",
    ]);
    expect(REWRITE_TARGETS.map((target) => target.label)).toEqual([
      "压缩成规范表达",
      "扩写成论证段",
      "改成开头",
      "改成结尾",
      "改成过渡句",
      "改成标题句",
      "自由改写",
    ]);
  });

  it("generates a target-specific prompt template with original text and extra instruction", () => {
    const prompt = generateRewritePrompt({
      targetId: "compress",
      originalText: "基层治理要把服务送到群众身边。",
      extraInstruction: "控制在 80 字以内。",
    });

    expect(prompt).toContain("压缩成规范表达");
    expect(prompt).toContain("语言要规范、凝练、适合申论作答直接调用");
    expect(prompt).toContain("基层治理要把服务送到群众身边。");
    expect(prompt).toContain("控制在 80 字以内。");
  });

  it("creates a trimmed saved rewrite log", () => {
    const log = createRewriteLog(
      {
        sourceMaterialId: "mat-1",
        targetId: "opening",
        originalText: "  原文  ",
        promptTemplate: "  提示  ",
        resultText: "  结果  ",
      },
      new Date("2026-05-23T08:00:00.000Z"),
      "rewrite-fixed",
    );

    expect(log).toMatchObject({
      id: "rewrite-fixed",
      sourceMaterialId: "mat-1",
      targetId: "opening",
      originalText: "原文",
      promptTemplate: "提示",
      resultText: "结果",
      status: "saved",
      createdAt: "2026-05-23T08:00:00.000Z",
      updatedAt: "2026-05-23T08:00:00.000Z",
    });
  });

  it("maps rewrite targets to material types for saving results", () => {
    expect(getRewriteTarget("title")?.resultMaterialType).toBe("title-sentence");
    expect(getRewriteTarget("transition")?.resultMaterialType).toBe("transition-sentence");
    expect(getRewriteTarget("expand_argument")?.resultMaterialType).toBe("argument");
  });

  it("builds a material input from a rewrite result", () => {
    const log = createRewriteLog(
      {
        sourceMaterialId: null,
        targetId: "title",
        originalText: "推动基层治理现代化。",
        promptTemplate: "提示",
        resultText: "以精细治理托举群众幸福",
      },
      new Date("2026-05-23T08:00:00.000Z"),
      "rewrite-title",
    );

    const material = buildMaterialInputFromRewrite(log);

    expect(material).toEqual({
      title: "Rewrite：改成标题句",
      contentMd: "以精细治理托举群众幸福",
      excerpt: "以精细治理托举群众幸福",
      materialType: "title-sentence",
      source: "Rewrite 工坊",
      tagNames: ["Rewrite"],
    });
  });
});
