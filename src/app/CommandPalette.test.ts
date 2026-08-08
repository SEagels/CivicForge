import { describe, expect, it, vi } from "vitest";
import { filterCommands, type AppCommand } from "./CommandPalette";

describe("command palette", () => {
  const commands: readonly AppCommand[] = [
    { id: "today", label: "今天", hint: "今日学习计划", keywords: ["dashboard"], run: vi.fn() },
    { id: "practice", label: "训练", hint: "申论作答工作台", keywords: ["答题"], run: vi.fn() },
    { id: "library", label: "素材", hint: "知识卡片", keywords: ["资料"], run: vi.fn() },
  ];

  it("returns every command for an empty query", () => {
    expect(filterCommands(commands, "")).toEqual(commands);
  });

  it("matches labels, hints, and keywords", () => {
    expect(filterCommands(commands, "作答").map((item) => item.id)).toEqual(["practice"]);
    expect(filterCommands(commands, "资料").map((item) => item.id)).toEqual(["library"]);
    expect(filterCommands(commands, "dashboard").map((item) => item.id)).toEqual(["today"]);
  });
});
