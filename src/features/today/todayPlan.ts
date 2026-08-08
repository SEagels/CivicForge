import type {
  LearningWorkspaceState,
  StudySession,
  StudySessionItem,
  StudyTask,
} from "../../domain/learning";
import type { MaterialDraft } from "../materials/materialModel";

export type StudyPlanMinutes = 15 | 30 | 60;

export function buildTodayTasks(
  materials: readonly MaterialDraft[],
  workspace: LearningWorkspaceState,
  now: Date = new Date(),
): readonly StudyTask[] {
  const nowMs = now.getTime();
  const reviews = materials
    .filter((item) => item.status === "active" && item.reviewEnabled)
    .filter((item) => item.nextReviewAt === null || Date.parse(item.nextReviewAt) <= nowMs)
    .slice(0, 12)
    .map((item, index): StudyTask => ({
      id: `review-${item.id}`,
      kind: "review",
      title: `回忆：${item.title}`,
      description: item.excerpt || "先回忆要点，再揭示答案。",
      estimatedMinutes: 3,
      entityId: item.id,
      priority: 100 - index,
      status: "pending",
    }));
  const practices = workspace.exercises
    .filter((item) => item.status === "active" || item.status === "draft")
    .slice(0, 4)
    .map((item, index): StudyTask => ({
      id: `practice-${item.id}`,
      kind: "practice",
      title: `继续训练：${item.title || "未命名练习"}`,
      description: `当前阶段：${item.currentStage}`,
      estimatedMinutes: 15,
      entityId: item.id,
      priority: 80 - index,
      status: "pending",
    }));
  const reflections = workspace.attempts
    .filter((item) => item.status === "submitted")
    .slice(0, 3)
    .map((item, index): StudyTask => ({
      id: `reflection-${item.id}`,
      kind: "reflection",
      title: "复盘一份已提交作答",
      description: "检查要点、结构、逻辑、表达与规范性。",
      estimatedMinutes: 10,
      entityId: item.exerciseId,
      priority: 70 - index,
      status: "pending",
    }));
  const intake = workspace.sources
    .filter((item) => item.status === "draft")
    .slice(0, 5)
    .map((item, index): StudyTask => ({
      id: `intake-${item.id}`,
      kind: "intake",
      title: `整理资料：${item.title || "快速记录"}`,
      description: item.publisher || "补充来源并提炼知识卡片。",
      estimatedMinutes: 5,
      entityId: item.id,
      priority: 50 - index,
      status: "pending",
    }));

  return [...reviews, ...practices, ...reflections, ...intake].sort(
    (left, right) => right.priority - left.priority,
  );
}

export function createStudySession(
  tasks: readonly StudyTask[],
  plannedMinutes: StudyPlanMinutes,
  now: Date = new Date(),
): { readonly session: StudySession; readonly items: readonly StudySessionItem[] } {
  const selected: StudyTask[] = [];
  let used = 0;
  for (const task of tasks) {
    if (selected.length > 0 && used + task.estimatedMinutes > plannedMinutes) continue;
    selected.push(task);
    used += task.estimatedMinutes;
    if (used >= plannedMinutes) break;
  }
  const id = `session-${now.getTime()}`;
  return {
    session: { id, plannedMinutes, startedAt: now.toISOString(), finishedAt: null, status: "active" },
    items: selected.map((task, order) => ({
      sessionId: id,
      task: { ...task, status: order === 0 ? "active" : "pending" },
      order,
      completedAt: null,
    })),
  };
}

export function completeStudyTask(
  items: readonly StudySessionItem[],
  taskId: string,
  now: Date = new Date(),
): readonly StudySessionItem[] {
  const index = items.findIndex((item) => item.task.id === taskId);
  return items.map((item, itemIndex) => {
    if (itemIndex === index) {
      return { ...item, task: { ...item.task, status: "completed" }, completedAt: now.toISOString() };
    }
    if (itemIndex === index + 1 && item.task.status === "pending") {
      return { ...item, task: { ...item.task, status: "active" } };
    }
    return item;
  });
}
