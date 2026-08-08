import { describe, expect, it } from "vitest";
import { EMPTY_LEARNING_WORKSPACE } from "../../domain/learning";
import { createInitialMaterialState } from "../materials/materialModel";
import { buildTodayTasks, completeStudyTask, createStudySession } from "./todayPlan";

describe("today plan", () => {
  it("builds due review tasks and fits them into a timed session", () => {
    const tasks = buildTodayTasks(
      createInitialMaterialState().materials,
      EMPTY_LEARNING_WORKSPACE,
      new Date("2026-07-26T10:00:00.000Z"),
    );
    const plan = createStudySession(tasks, 15, new Date("2026-07-26T10:00:00.000Z"));

    expect(tasks.some((task) => task.kind === "review")).toBe(true);
    expect(plan.session.plannedMinutes).toBe(15);
    expect(plan.items[0]?.task.status).toBe("active");
  });

  it("advances to the next task when the current task is completed", () => {
    const tasks = [
      { id: "a", kind: "review" as const, title: "A", description: "", estimatedMinutes: 3, entityId: "a", priority: 2, status: "pending" as const },
      { id: "b", kind: "intake" as const, title: "B", description: "", estimatedMinutes: 3, entityId: "b", priority: 1, status: "pending" as const },
    ];
    const plan = createStudySession(tasks, 15);
    const result = completeStudyTask(plan.items, "a");
    expect(result[0]?.task.status).toBe("completed");
    expect(result[1]?.task.status).toBe("active");
  });

  it("prioritizes due knowledge review cards and links the task to the review card", () => {
    const workspace = {
      ...EMPTY_LEARNING_WORKSPACE,
      cards: [{
        id: "card-1", title: "基层治理表达", contentMd: "完整表达", summary: "摘要",
        cardType: "standard-expression" as const, topicSlug: "grassroots-governance",
        lifecycle: "usable" as const, verificationStatus: "user-verified" as const,
        core: false, reviewEnabled: true, sourceLabel: "人工整理", tagNames: [],
        questionTypeSlugs: ["analysis"], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
      }],
      reviewCards: [{
        id: "review-card-1", knowledgeCardId: "card-1", mode: "expression-recall" as const,
        promptMd: "复述这条表达", answerMd: "完整表达", nextReviewAt: null, lastReviewedAt: null,
        ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0,
      }],
    };

    const tasks = buildTodayTasks([], workspace, new Date("2026-08-08T10:00:00.000Z"));

    expect(tasks[0]).toMatchObject({ kind: "review", entityId: "review-card-1", priority: 110 });
  });
});
