import { describe, expect, it } from "vitest";
import { createExercise, createManualFeedback, nextPracticeStage } from "./practiceModel";

describe("practice model", () => {
  it("creates a resumable exercise and attempt", () => {
    const result = createExercise(new Date("2026-07-26T10:00:00.000Z"));
    expect(result.exercise.currentStage).toBe("reading");
    expect(result.attempt.exerciseId).toBe(result.exercise.id);
    expect(result.attempt.status).toBe("in-progress");
  });

  it("advances through the four practice stages", () => {
    expect(nextPracticeStage("reading")).toBe("outline");
    expect(nextPracticeStage("outline")).toBe("answer");
    expect(nextPracticeStage("answer")).toBe("reflection");
    expect(nextPracticeStage("reflection")).toBe("reflection");
  });

  it("records manual feedback without replacing the attempt", () => {
    const feedback = createManualFeedback(
      "attempt-1",
      { keyPoints: 4, structure: 3, logic: 4, expression: 3, compliance: 5 },
      "要点较全",
      "加强总括句",
      new Date("2026-07-26T10:00:00.000Z"),
    );
    expect(feedback.attemptId).toBe("attempt-1");
    expect(feedback.source).toBe("manual");
  });
});
