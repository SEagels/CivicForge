import { useMemo, useState } from "react";
import type { LearningWorkspaceState, StudyTask } from "../../domain/learning";
import type { MaterialDraft } from "../materials/materialModel";
import { buildTodayTasks, type StudyPlanMinutes } from "./todayPlan";

interface TodayPanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly workspace: LearningWorkspaceState;
  readonly storageMode: string;
  readonly storageError: string | null;
  readonly onStartPlan: (minutes: StudyPlanMinutes, tasks: readonly StudyTask[]) => void;
  readonly onOpenTask: (task: StudyTask) => void;
  readonly onQuickCapture: (text: string) => void;
}

export function TodayPanel({
  materials,
  workspace,
  storageMode,
  storageError,
  onStartPlan,
  onOpenTask,
  onQuickCapture,
}: TodayPanelProps) {
  const [minutes, setMinutes] = useState<StudyPlanMinutes>(30);
  const [capture, setCapture] = useState("");
  const tasks = useMemo(() => buildTodayTasks(materials, workspace), [materials, workspace]);
  const activeSession = workspace.sessions.find((session) => session.status === "active");
  const activeItem = activeSession
    ? workspace.sessionItems.find((item) => item.sessionId === activeSession.id && item.task.status === "active")
    : null;

  return (
    <section className="today-workspace feature-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">TODAY</p>
          <h1>今天学什么，打开就知道。</h1>
          <p className="workspace-subtitle">本地数据 · {storageMode}</p>
          {storageError ? <p className="storage-error" title={storageError}>SQLite 诊断：{storageError}</p> : null}
        </div>
        <div className="plan-control" aria-label="学习时长">
          {([15, 30, 60] as const).map((value) => (
            <button key={value} type="button" className={minutes === value ? "active" : ""} onClick={() => setMinutes(value)}>
              {value} 分钟
            </button>
          ))}
        </div>
      </header>

      {activeItem ? (
        <section className="focus-banner">
          <div><span>继续上次学习</span><strong>{activeItem.task.title}</strong></div>
          <button type="button" className="primary-button" onClick={() => onOpenTask(activeItem.task)}>继续</button>
        </section>
      ) : null}

      <div className="today-grid">
        <section className="feature-panel task-plan">
          <div className="panel-title-row">
            <div><p className="eyebrow">LEARNING PLAN</p><h2>建议任务</h2></div>
            <button type="button" className="primary-button" disabled={tasks.length === 0} onClick={() => onStartPlan(minutes, tasks)}>
              开始 {minutes} 分钟
            </button>
          </div>
          {tasks.length ? (
            <div className="task-list">
              {tasks.slice(0, 8).map((task) => (
                <button type="button" className="task-row" key={task.id} onClick={() => onOpenTask(task)}>
                  <span className={`task-kind ${task.kind}`}>{taskKindLabel(task.kind)}</span>
                  <span><strong>{task.title}</strong><small>{task.description}</small></span>
                  <time>{task.estimatedMinutes}m</time>
                </button>
              ))}
            </div>
          ) : <div className="empty-list"><strong>今天没有积压任务</strong><span>快速记录一条资料，或去训练页开始新练习。</span></div>}
        </section>

        <aside className="feature-panel quick-capture">
          <p className="eyebrow">INBOX</p>
          <h2>快速记录</h2>
          <textarea value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="粘贴一句政策表述、案例线索或待整理想法…" />
          <button type="button" className="primary-button" disabled={!capture.trim()} onClick={() => { onQuickCapture(capture); setCapture(""); }}>
            存入资料收件箱
          </button>
          <div className="today-summary">
            <span><strong>{tasks.filter((item) => item.kind === "review").length}</strong> 待复习</span>
            <span><strong>{tasks.filter((item) => item.kind === "practice").length}</strong> 待训练</span>
            <span><strong>{tasks.filter((item) => item.kind === "intake").length}</strong> 待整理</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function taskKindLabel(kind: StudyTask["kind"]): string {
  return { review: "复习", practice: "训练", reflection: "复盘", intake: "整理" }[kind];
}
