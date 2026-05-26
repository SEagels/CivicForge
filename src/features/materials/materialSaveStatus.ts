export type MaterialSaveStatus =
  | { readonly kind: "loading" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved"; readonly savedAt: string }
  | { readonly kind: "error" };

export function formatMaterialSaveStatus(status: MaterialSaveStatus, now: Date = new Date()): string {
  if (status.kind === "loading") {
    return "正在加载本地数据";
  }

  if (status.kind === "saving") {
    return "正在保存";
  }

  if (status.kind === "error") {
    return "保存失败";
  }

  const savedAt = new Date(status.savedAt);
  const elapsedMs = Math.max(0, now.getTime() - savedAt.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  if (elapsedMinutes < 1) {
    return "已保存";
  }

  return `已保存 ${elapsedMinutes} 分钟前`;
}
