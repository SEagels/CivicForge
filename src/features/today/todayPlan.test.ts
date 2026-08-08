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
});
