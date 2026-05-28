import type { ReviewLog } from "./reviewSession";

export const CIVICFORGE_REVIEW_STORAGE_KEY = "civicforge.review.logs.v1";

const REVIEW_PERSISTENCE_VERSION = 1;

interface PersistedReviewLogs {
  readonly version: typeof REVIEW_PERSISTENCE_VERSION;
  readonly logs: readonly ReviewLog[];
}

export function serializeReviewLogs(logs: readonly ReviewLog[]): string {
  const payload: PersistedReviewLogs = {
    version: REVIEW_PERSISTENCE_VERSION,
    logs,
  };

  return JSON.stringify(payload);
}

export function saveReviewLogs(storage: Storage, logs: readonly ReviewLog[]): void {
  storage.setItem(CIVICFORGE_REVIEW_STORAGE_KEY, serializeReviewLogs(logs));
}

export function loadReviewLogs(storage: Storage): readonly ReviewLog[] {
  const raw = storage.getItem(CIVICFORGE_REVIEW_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const payload = JSON.parse(raw) as Partial<PersistedReviewLogs>;

    if (payload.version !== REVIEW_PERSISTENCE_VERSION || !isReviewLogs(payload.logs)) {
      return [];
    }

    return payload.logs;
  } catch {
    return [];
  }
}

export function clearReviewLogs(storage: Storage): void {
  storage.removeItem(CIVICFORGE_REVIEW_STORAGE_KEY);
}

export function getBrowserReviewStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function isReviewLogs(value: unknown): value is readonly ReviewLog[] {
  return Array.isArray(value) && value.every(isReviewLog);
}

export function isReviewLog(value: unknown): value is ReviewLog {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as ReviewLog;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.materialId === "string" &&
    typeof candidate.reviewedAt === "string" &&
    (candidate.rating === "again" || candidate.rating === "hard" || candidate.rating === "good" || candidate.rating === "easy") &&
    candidate.reviewMode === "active-recall" &&
    typeof candidate.topicSlug === "string" &&
    Array.isArray(candidate.questionTypeSlugs) &&
    candidate.questionTypeSlugs.every((slug) => typeof slug === "string") &&
    typeof candidate.materialType === "string" &&
    (typeof candidate.previousDueAt === "string" || candidate.previousDueAt === null) &&
    typeof candidate.nextDueAt === "string" &&
    typeof candidate.previousIntervalDays === "number" &&
    typeof candidate.nextIntervalDays === "number" &&
    typeof candidate.previousEase === "number" &&
    typeof candidate.nextEase === "number" &&
    (typeof candidate.elapsedMs === "number" || candidate.elapsedMs === null) &&
    (typeof candidate.answerRevealedAt === "string" || candidate.answerRevealedAt === null) &&
    typeof candidate.note === "string"
  );
}
