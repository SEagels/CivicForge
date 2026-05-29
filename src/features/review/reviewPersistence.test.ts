import { describe, expect, it } from "vitest";
import {
  CIVICFORGE_REVIEW_STORAGE_KEY,
  clearReviewLogs,
  loadReviewLogs,
  saveReviewLogs,
  serializeReviewLogs,
} from "./reviewPersistence";
import type { ReviewLog } from "./reviewSession";

describe("review persistence", () => {
  it("serializes, saves, and loads review logs", () => {
    const storage = createMemoryStorage();
    const logs = [createReviewLog()];

    saveReviewLogs(storage, logs);

    expect(storage.getItem(CIVICFORGE_REVIEW_STORAGE_KEY)).toBe(serializeReviewLogs(logs));
    expect(loadReviewLogs(storage)).toEqual(logs);
  });

  it("returns an empty list for missing, malformed, or incompatible payloads", () => {
    const storage = createMemoryStorage();

    expect(loadReviewLogs(storage)).toEqual([]);

    storage.setItem(CIVICFORGE_REVIEW_STORAGE_KEY, "{bad json");
    expect(loadReviewLogs(storage)).toEqual([]);

    storage.setItem(CIVICFORGE_REVIEW_STORAGE_KEY, JSON.stringify({ version: 999, logs: [createReviewLog()] }));
    expect(loadReviewLogs(storage)).toEqual([]);
  });

  it("clears persisted review logs", () => {
    const storage = createMemoryStorage();
    saveReviewLogs(storage, [createReviewLog()]);

    clearReviewLogs(storage);

    expect(storage.getItem(CIVICFORGE_REVIEW_STORAGE_KEY)).toBeNull();
  });
});

function createReviewLog(): ReviewLog {
  return {
    id: "review-1",
    materialId: "mat-1",
    reviewedAt: "2026-05-28T08:00:00.000Z",
    rating: "good",
    reviewMode: "active-recall",
    topicSlug: "grassroots-governance",
    questionTypeSlugs: ["countermeasure"],
    materialType: "standard-expression",
    previousDueAt: null,
    nextDueAt: "2026-05-29T08:00:00.000Z",
    previousIntervalDays: 0,
    nextIntervalDays: 1,
    previousEase: 2.5,
    nextEase: 2.5,
    elapsedMs: 60_000,
    answerRevealedAt: "2026-05-28T07:59:30.000Z",
    note: "",
  };
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
