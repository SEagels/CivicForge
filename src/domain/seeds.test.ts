import { describe, expect, it } from "vitest";
import {
  BUILTIN_MATERIAL_TYPES,
  BUILTIN_QUESTION_TYPES,
  BUILTIN_TOPICS,
} from "./seeds";

describe("built-in civil service essay taxonomy", () => {
  it("includes the required essay topics", () => {
    expect(BUILTIN_TOPICS.map((topic) => topic.name)).toEqual([
      "基层治理",
      "乡村振兴",
      "数字政府",
      "民生服务",
      "营商环境",
      "生态文明",
      "应急管理",
      "青年发展",
      "文化传承",
      "社会治理",
      "高质量发展",
      "共同富裕",
    ]);
  });

  it("includes the required material types", () => {
    expect(BUILTIN_MATERIAL_TYPES.map((type) => type.name)).toEqual([
      "问题",
      "原因",
      "对策",
      "案例",
      "规范表达",
      "金句",
      "标题句",
      "过渡句",
      "文章框架",
      "分论点",
      "开头",
      "结尾",
    ]);
  });

  it("includes the required question types", () => {
    expect(BUILTIN_QUESTION_TYPES.map((type) => type.name)).toEqual([
      "归纳概括",
      "提出对策",
      "综合分析",
      "贯彻执行",
      "申发论述",
      "面试综合分析",
      "通用素材",
    ]);
  });

  it("keeps slugs stable and unique for import/export", () => {
    const allSlugs = [
      ...BUILTIN_TOPICS.map((topic) => topic.slug),
      ...BUILTIN_MATERIAL_TYPES.map((type) => type.slug),
      ...BUILTIN_QUESTION_TYPES.map((type) => type.slug),
    ];

    expect(new Set(allSlugs).size).toBe(allSlugs.length);
    expect(allSlugs.every((slug) => /^[a-z0-9-]+$/.test(slug))).toBe(true);
  });
});
