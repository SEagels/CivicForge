import { useEffect, useMemo, useState } from "react";
import type { LearningWorkspaceState, SourceDocument, StudyTask } from "../../domain/learning";
import { createAppDataService, type AppDataService } from "../appData/appDataService";
import type { MaterialDraft } from "../materials/materialModel";
import { buildTodayTasks } from "../today/todayPlan";
import { loadWidgetPreferences } from "./widgetPreferences";

export function StudyWidget() {
  const [materials, setMaterials] = useState<readonly MaterialDraft[]>([]);
  const [workspace, setWorkspace] = useState<LearningWorkspaceState | null>(null);
  const [capture, setCapture] = useState("");
  const [saved, setSaved] = useState(false);
  const [service, setService] = useState<AppDataService | null>(null);
  const preferences = loadWidgetPreferences(typeof window === "undefined" ? null : window.localStorage);
  const tasks = useMemo(() => workspace ? buildTodayTasks(materials, workspace).slice(0, 3) : [], [materials, workspace]);
  const dailyCard = useMemo(() => {
    const cards = workspace?.cards.filter((item) => item.lifecycle === "usable" || item.lifecycle === "core") ?? [];
    return cards.length ? cards[new Date().getDate() % cards.length] : null;
  }, [workspace]);

  useEffect(() => {
    let cancelled = false;
    const dataService = createAppDataService();
    setService(dataService);
    void dataService.load().then((snapshot) => {
      if (cancelled) return;
      setMaterials(snapshot.materialsState.materials);
      setWorkspace(snapshot.learningWorkspace);
    });
    return () => { cancelled = true; };
  }, []);

  const quickSave = async () => {
    if (!workspace || !service || !capture.trim()) return;
    const now = new Date();
    const source: SourceDocument = {
      id: `source-${now.getTime()}`, title: capture.trim().split(/\r?\n/)[0]?.slice(0, 36) || "快速记录",
      sourceType: "note", contentMd: capture.trim(), sourceUri: "", publisher: "", publishedAt: null,
      status: "draft", createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };
    const next = { ...workspace, sources: [source, ...workspace.sources.filter((item) => item.id !== source.id)] };
    await service.saveSource(source);
    setWorkspace(next);
    setCapture("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
    await emitEntityChanged(source.id);
  };

  return <main className={`study-widget ${preferences.compact ? "compact" : ""}`}>
    <header><div><span>CivicForge</span><strong>{preferences.privacyMode ? "今日学习" : "申论学习小组件"}</strong></div><button type="button" title="打开主程序" onClick={() => void openMain("today")}>↗</button></header>
    {tasks[0] ? <button type="button" className="widget-primary-task" onClick={() => void openTask(tasks[0])}><small>下一项 · {tasks[0].estimatedMinutes} 分钟</small><strong>{preferences.privacyMode ? "继续今日任务" : tasks[0].title}</strong></button> : <div className="widget-empty">今天没有到期任务</div>}
    {!preferences.compact && dailyCard ? <button type="button" className="widget-card" onClick={() => void openMain("library", dailyCard.id, "cards")}><small>每日一卡</small><span>{preferences.privacyMode ? "已隐藏内容" : dailyCard.title}</span></button> : null}
    <div className="widget-capture"><input value={capture} onChange={(event) => setCapture(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void quickSave(); }} placeholder="快速记录到资料收件箱" /><button type="button" disabled={!capture.trim()} title="保存" onClick={() => void quickSave()}>{saved ? "✓" : "+"}</button></div>
  </main>;
}

async function openTask(task: StudyTask): Promise<void> {
  await openMain(
    task.kind === "review" ? "review" : task.kind === "intake" ? "library" : "practice",
    task.entityId,
    task.kind === "intake" ? "sources" : null,
  );
}

async function openMain(
  route: string,
  entityId: string | null = null,
  librarySection: "sources" | "cards" | null = null,
): Promise<void> {
  if (!("__TAURI_INTERNALS__" in globalThis)) return;
  const [{ getAllWindows }, { emitTo }] = await Promise.all([
    import("@tauri-apps/api/window"),
    import("@tauri-apps/api/event"),
  ]);
  const main = (await getAllWindows()).find((window) => window.label === "main");
  await main?.show();
  await main?.setFocus();
  await emitTo("main", "widget-open-route", { route, entityId, librarySection });
}

async function emitEntityChanged(entityId: string): Promise<void> {
  if (!("__TAURI_INTERNALS__" in globalThis)) return;
  const { emit } = await import("@tauri-apps/api/event");
  await emit("entity-changed", { entityType: "source", entityId, revision: Date.now() });
}
