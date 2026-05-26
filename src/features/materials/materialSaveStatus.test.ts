import { describe, expect, it } from "vitest";
import { formatMaterialSaveStatus, type MaterialSaveStatus } from "./materialSaveStatus";

describe("material save status", () => {
  it.each<[MaterialSaveStatus, string]>([
    [{ kind: "loading" }, "正在加载本地数据"],
    [{ kind: "saving" }, "正在保存"],
    [{ kind: "error" }, "保存失败"],
  ])("formats %s as %s", (status, label) => {
    expect(formatMaterialSaveStatus(status, new Date("2026-05-26T10:00:00.000Z"))).toBe(label);
  });

  it("shows a compact saved label for recent writes", () => {
    expect(
      formatMaterialSaveStatus(
        {
          kind: "saved",
          savedAt: "2026-05-26T09:59:50.000Z",
        },
        new Date("2026-05-26T10:00:00.000Z"),
      ),
    ).toBe("已保存");
  });

  it("includes elapsed minutes for older saved writes", () => {
    expect(
      formatMaterialSaveStatus(
        {
          kind: "saved",
          savedAt: "2026-05-26T09:51:00.000Z",
        },
        new Date("2026-05-26T10:00:00.000Z"),
      ),
    ).toBe("已保存 9 分钟前");
  });
});
