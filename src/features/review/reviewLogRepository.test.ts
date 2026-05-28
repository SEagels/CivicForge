import { describe, expect, it } from "vitest";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { REVIEW_LOG_REPOSITORY_SQL } from "../../lib/db/reviewLogRepositorySql";
import {
  buildReviewLogParams,
  createReviewLogRepository,
  mapReviewLogRow,
  type ReviewLogRepositoryRow,
} from "./reviewLogRepository";
import type { ReviewLog } from "./reviewSession";

describe("review log repository", () => {
  it("maps SQLite rows into review logs", () => {
    expect(mapReviewLogRow(createRow())).toEqual(createReviewLog());
  });

  it("builds positional upsert params", () => {
    expect(buildReviewLogParams(createReviewLog())).toEqual([
      "review-1",
      "mat-1",
      "2026-05-28T08:00:00.000Z",
      "good",
      "active-recall",
      "grassroots-governance",
      "countermeasure,essay",
      "standard-expression",
      null,
      "2026-05-29T08:00:00.000Z",
      0,
      1,
      2.5,
      2.5,
      60_000,
      "2026-05-28T07:59:30.000Z",
      "",
    ]);
  });

  it("lists, saves, and replaces review logs through SQL statements", async () => {
    const db = createFakeDb([createRow()]);
    const repository = createReviewLogRepository(db);

    await expect(repository.listReviewLogs()).resolves.toEqual([createReviewLog()]);
    await repository.saveReviewLog(createReviewLog());
    await repository.replaceReviewLogs([createReviewLog()]);
    await repository.clearReviewLogs();

    expect(db.executed.map((item) => item.query)).toEqual([
      REVIEW_LOG_REPOSITORY_SQL.upsertReviewLog,
      REVIEW_LOG_REPOSITORY_SQL.clearReviewLogs,
      REVIEW_LOG_REPOSITORY_SQL.upsertReviewLog,
      REVIEW_LOG_REPOSITORY_SQL.clearReviewLogs,
    ]);
  });
});

function createRow(): ReviewLogRepositoryRow {
  return {
    uuid: "review-1",
    material_uuid: "mat-1",
    reviewed_at: "2026-05-28T08:00:00.000Z",
    rating: "good",
    review_mode: "active-recall",
    topic_slug: "grassroots-governance",
    question_type_slugs: "countermeasure,essay",
    material_type: "standard-expression",
    previous_due_at: null,
    next_due_at: "2026-05-29T08:00:00.000Z",
    previous_interval_days: 0,
    next_interval_days: 1,
    previous_ease: 2.5,
    next_ease: 2.5,
    elapsed_ms: 60_000,
    answer_revealed_at: "2026-05-28T07:59:30.000Z",
    note: "",
  };
}

function createReviewLog(): ReviewLog {
  return {
    id: "review-1",
    materialId: "mat-1",
    reviewedAt: "2026-05-28T08:00:00.000Z",
    rating: "good",
    reviewMode: "active-recall",
    topicSlug: "grassroots-governance",
    questionTypeSlugs: ["countermeasure", "essay"],
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

function createFakeDb(rows: readonly ReviewLogRepositoryRow[]) {
  const executed: { query: string; bindValues?: unknown[] }[] = [];
  const db: CivicForgeDatabase & { executed: typeof executed } = {
    executed,
    execute: async (query, bindValues) => {
      executed.push({ query, bindValues });
      return { rowsAffected: 1 };
    },
    select: async <T,>() => rows as T,
    close: async () => true,
  };

  return db;
}
