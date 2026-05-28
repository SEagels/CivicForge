import type { MaterialTypeId, ReviewRating } from "../../domain/enums";
import type { MaterialDraft } from "../materials/materialModel";
import type { ReviewSchedule } from "./reviewScheduler";

export type ReviewMode = "active-recall";

export interface ReviewLog {
  readonly id: string;
  readonly materialId: string;
  readonly reviewedAt: string;
  readonly rating: ReviewRating;
  readonly reviewMode: ReviewMode;
  readonly topicSlug: string;
  readonly questionTypeSlugs: readonly string[];
  readonly materialType: MaterialTypeId;
  readonly previousDueAt: string | null;
  readonly nextDueAt: string;
  readonly previousIntervalDays: number;
  readonly nextIntervalDays: number;
  readonly previousEase: number;
  readonly nextEase: number;
  readonly elapsedMs: number | null;
  readonly answerRevealedAt: string | null;
  readonly note: string;
}

export interface ReviewSessionState {
  readonly materialId: string;
  readonly mode: ReviewMode;
  readonly startedAt: string;
  readonly answerRevealedAt: string | null;
}

export interface CompletedReviewSessionState extends ReviewSessionState {
  readonly completedAt: string;
  readonly rating: ReviewRating;
  readonly elapsedMs: number;
}

export function startReviewSession(material: MaterialDraft, now: Date = new Date()): ReviewSessionState {
  return {
    materialId: material.id,
    mode: "active-recall",
    startedAt: now.toISOString(),
    answerRevealedAt: null,
  };
}

export function revealReviewAnswer(session: ReviewSessionState, now: Date = new Date()): ReviewSessionState {
  if (session.answerRevealedAt) {
    return session;
  }

  return {
    ...session,
    answerRevealedAt: now.toISOString(),
  };
}

export function completeReviewSession(
  session: ReviewSessionState,
  rating: ReviewRating,
  now: Date = new Date(),
): CompletedReviewSessionState | null {
  if (!session.answerRevealedAt) {
    return null;
  }

  const completedAt = now.toISOString();

  return {
    ...session,
    completedAt,
    rating,
    elapsedMs: Math.max(0, now.getTime() - Date.parse(session.startedAt)),
  };
}

export function buildReviewLogEntry(
  material: MaterialDraft,
  previousSchedule: ReviewSchedule,
  nextMaterial: MaterialDraft,
  session: CompletedReviewSessionState,
  id = createReviewLogId(material.id, session.completedAt),
): ReviewLog {
  return {
    id,
    materialId: material.id,
    reviewedAt: session.completedAt,
    rating: session.rating,
    reviewMode: session.mode,
    topicSlug: material.topicSlug,
    questionTypeSlugs: material.questionTypeSlugs,
    materialType: material.materialType,
    previousDueAt: previousSchedule.nextReviewAt,
    nextDueAt: nextMaterial.nextReviewAt ?? session.completedAt,
    previousIntervalDays: previousSchedule.reviewIntervalDays,
    nextIntervalDays: nextMaterial.reviewIntervalDays,
    previousEase: previousSchedule.reviewEase,
    nextEase: nextMaterial.reviewEase,
    elapsedMs: session.elapsedMs,
    answerRevealedAt: session.answerRevealedAt,
    note: "",
  };
}

function createReviewLogId(materialId: string, completedAt: string): string {
  return `review-${materialId}-${Date.parse(completedAt).toString(36)}`;
}
