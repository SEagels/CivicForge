export type StorageDiagnosticMode = "SQLite" | "Preview localStorage";

export interface StorageDiagnosticsInput {
  readonly storageMode: StorageDiagnosticMode;
  readonly materialCount: number;
  readonly rewriteLogCount: number;
  readonly backupReminderEnabled: boolean;
}

export interface StorageDiagnostics {
  readonly storageLabel: string;
  readonly storageDescription: string;
  readonly backupLabel: string;
  readonly backupDescription: string;
  readonly summary: string;
}

export function getStorageDiagnostics(input: StorageDiagnosticsInput): StorageDiagnostics {
  const storageIsSqlite = input.storageMode === "SQLite";
  const backupEnabled = input.backupReminderEnabled;

  return {
    storageLabel: storageIsSqlite ? "桌面 SQLite" : "浏览器预览",
    storageDescription: storageIsSqlite
      ? "数据写入 Tauri 本地数据库 civicforge.db。"
      : "当前没有 Tauri 运行时，数据暂存到浏览器 localStorage。",
    backupLabel: backupEnabled ? "已开启" : "未开启",
    backupDescription: backupEnabled
      ? "设置页会保留手动备份提醒，适合每次学习结束后导出一份 JSON 归档。"
      : "仍可手动导出 JSON 归档；建议正式使用时打开提醒。",
    summary: `${input.materialCount} 条素材，${input.rewriteLogCount} 条 Rewrite 记录`,
  };
}
