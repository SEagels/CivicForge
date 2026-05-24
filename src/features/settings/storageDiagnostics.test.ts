import { describe, expect, it } from "vitest";
import { getStorageDiagnostics } from "./storageDiagnostics";

describe("storage diagnostics", () => {
  it("describes SQLite desktop storage with backup reminders enabled", () => {
    expect(
      getStorageDiagnostics({
        storageMode: "SQLite",
        materialCount: 12,
        rewriteLogCount: 3,
        backupReminderEnabled: true,
      }),
    ).toEqual({
      storageLabel: "桌面 SQLite",
      storageDescription: "数据写入 Tauri 本地数据库 civicforge.db。",
      backupLabel: "已开启",
      backupDescription: "设置页会保留手动备份提醒，适合每次学习结束后导出一份 JSON 归档。",
      summary: "12 条素材，3 条 Rewrite 记录",
    });
  });

  it("describes preview localStorage with backup reminders disabled", () => {
    expect(
      getStorageDiagnostics({
        storageMode: "Preview localStorage",
        materialCount: 0,
        rewriteLogCount: 0,
        backupReminderEnabled: false,
      }),
    ).toEqual({
      storageLabel: "浏览器预览",
      storageDescription: "当前没有 Tauri 运行时，数据暂存到浏览器 localStorage。",
      backupLabel: "未开启",
      backupDescription: "仍可手动导出 JSON 归档；建议正式使用时打开提醒。",
      summary: "0 条素材，0 条 Rewrite 记录",
    });
  });
});
