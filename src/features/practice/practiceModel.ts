import type { Attempt, Exercise, FeedbackRecord, PracticeStage } from "../../domain/learning";

export function createExercise(now: Date = new Date()): { exercise: Exercise; attempt: Attempt } {
  const stamp = now.getTime();
  const exerciseId = `exercise-${stamp}`;
  return {
    exercise: {
      id: exerciseId,
      title: "未命名申论练习",
      promptMd: "",
      questionTypeSlug: "analysis",
      wordLimit: 300,
      timeLimitMinutes: 30,
      status: "draft",
      currentStage: "reading",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    attempt: {
      id: `attempt-${stamp}`,
      exerciseId,
      outlineMd: "",
      answerMd: "",
      status: "in-progress",
      startedAt: now.toISOString(),
      finishedAt: null,
      elapsedMs: 0,
      updatedAt: now.toISOString(),
    },
  };
}

export function nextPracticeStage(stage: PracticeStage): PracticeStage {
  const stages: readonly PracticeStage[] = ["reading", "outline", "answer", "reflection"];
  return stages[Math.min(stages.indexOf(stage) + 1, stages.length - 1)];
}

export function createManualFeedback(
  attemptId: string,
  dimensions: FeedbackRecord["dimensions"],
  summaryMd: string,
  suggestionsMd: string,
  now: Date = new Date(),
): FeedbackRecord {
  return {
    id: `feedback-${now.getTime()}`,
    attemptId,
    source: "manual",
    dimensions,
    summaryMd,
    suggestionsMd,
    createdAt: now.toISOString(),
  };
}
