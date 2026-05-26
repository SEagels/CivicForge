import { describe, expect, it } from "vitest";
import {
  applyMarkdownCommand,
  getWikiLinkSuggestions,
  getWikiLinkTrigger,
  insertWikiLinkSuggestion,
  type LinkableMaterial,
} from "./markdownEditing";

const materials: readonly LinkableMaterial[] = [
  { id: "current", title: "基层治理案例" },
  { id: "a", title: "数字政府表达" },
  { id: "b", title: "乡村振兴案例" },
  { id: "c", title: "数字政府表达" },
  { id: "d", title: "共同富裕金句" },
];

describe("markdown editing helpers", () => {
  it("detects an open wiki-link trigger before the cursor", () => {
    expect(getWikiLinkTrigger("参考 [[数字", 7)).toEqual({
      start: 3,
      end: 7,
      query: "数字",
    });
  });

  it("does not detect a trigger after a wiki-link has already been closed", () => {
    expect(getWikiLinkTrigger("参考 [[数字政府表达]] 后续", 15)).toBeNull();
  });

  it("filters wiki-link suggestions by query, excludes the current material, deduplicates titles, and sorts by Chinese locale", () => {
    expect(getWikiLinkSuggestions(materials, "current", "数字")).toEqual([
      { id: "a", title: "数字政府表达" },
    ]);

    expect(getWikiLinkSuggestions(materials, "current", "")).toEqual([
      { id: "d", title: "共同富裕金句" },
      { id: "a", title: "数字政府表达" },
      { id: "b", title: "乡村振兴案例" },
    ]);
  });

  it("replaces the active wiki-link trigger with the selected title", () => {
    expect(
      insertWikiLinkSuggestion("参考 [[数 后续", {
        title: "数字政府表达",
        trigger: { start: 3, end: 6, query: "数" },
      }),
    ).toEqual({
      value: "参考 [[数字政府表达]] 后续",
      selectionStart: 13,
      selectionEnd: 13,
    });
  });

  it.each([
    ["bold", "强调表达", 0, 4, "**强调表达**", 6],
    ["italic", "规范表达", 0, 4, "_规范表达_", 5],
    ["wiki", "数字政府", 0, 4, "[[数字政府]]", 6],
  ] as const)("wraps selected text for %s command", (command, value, start, end, expectedValue, expectedCursor) => {
    expect(applyMarkdownCommand(value, { command, selectionStart: start, selectionEnd: end })).toEqual({
      value: expectedValue,
      selectionStart: expectedCursor,
      selectionEnd: expectedCursor,
    });
  });

  it("toggles wrapping markers when the selected text is already wrapped", () => {
    expect(applyMarkdownCommand("**强调表达**", { command: "bold", selectionStart: 2, selectionEnd: 6 })).toEqual({
      value: "强调表达",
      selectionStart: 0,
      selectionEnd: 4,
    });
  });

  it("applies heading and quote commands to the current line", () => {
    expect(applyMarkdownCommand("第一段\n治理表达", { command: "heading2", selectionStart: 5, selectionEnd: 5 })).toEqual({
      value: "第一段\n## 治理表达",
      selectionStart: 8,
      selectionEnd: 8,
    });

    expect(applyMarkdownCommand("治理表达", { command: "quote", selectionStart: 2, selectionEnd: 2 })).toEqual({
      value: "> 治理表达",
      selectionStart: 4,
      selectionEnd: 4,
    });
  });
});
