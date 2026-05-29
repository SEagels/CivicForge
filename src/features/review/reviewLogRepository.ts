import type { MaterialTypeId, ReviewRating } from "../../domain/enums";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { REVIEW_LOG_REPOSITORY_SQL } from "../../lib/db/reviewLogRepositorySql";
import type { ReviewLog, ReviewMode } from "./reviewSession";

export interface ReviewLogRepositoryRow {
  readonly uuid: string;
  readonly material_uuid: string;
  readonly reviewed_at: string;
  readonly rating: ReviewRating;
  readonly review_mode: ReviewMode;
  readonly topic_slug: string;
  readonly question_type_slugs: string;
  readonly material_type: MaterialTypeId;
  readonly previous_due_at: string | null;
  readonly next_due_at: string;
  readonly previous_interval_days: number;
  readonly next_interval_days: number;
  readonly previous_ease: number;
  readonly next_ease: number;
  readonly elapsed_ms: number | null;
  readonly answer_revealed_at: string | null;
  readonly note: string;
}

export interface ReviewLogRepository {
  listReviewLogs(): Promise<readonly ReviewLog[]>;
  saveReviewLog(log: ReviewLog): Promise<void>;
  replaceReviewLogs(logs: readonly ReviewLog[]): Promise<void>;
  clearReviewLogs(): Promise<void>;
}

export function createReviewLogRepository(db: CivicForgeDatabase): ReviewLogRepository {
  return {
    async listReviewLogs() {
      const rows = await db.select<ReviewLogRepositoryRow[]>(REVIEW_LOG_REPOSITORY_SQL.listReviewLogs);
      return rows.map(mapReviewLogRow);
    },

    async saveReviewLog(log) {
      await db.execute(REVIEW_LOG_REPOSITORY_SQL.upsertReviewLog, buildReviewLogParams(log));
    },

    async replaceReviewLogs(logs) {
      await db.execute(REVIEW_LOG_REPOSITORY_SQL.clearReviewLogs);

      for (const log of logs) {
        await db.execute(REVIEW_LOG_REPOSITORY_SQL.upsertReviewLog, buildReviewLogParams(log));
      }
    },

    async clearReviewLogs() {
      await db.execute(REVIEW_LOG_REPOSITORY_SQL.clearReviewLogs);
    },
  };
}

export function mapReviewLogRow(row: ReviewLogRepositoryRow): ReviewLog {
  return {
    id: row.uuid,
    materialId: row.material_uuid,
    reviewedAt: row.reviewed_at,
    rating: row.rating,
    reviewMode: row.review_mode,
    topicSlug: row.topic_slug,
    questionTypeSlugs: splitJoinedValues(row.question_type_slugs),
    materialType: row.material_type,
    previousDueAt: row.previous_due_at,
    nextDueAt: row.next_due_at,
    previousIntervalDays: row.previous_interval_days,
    nextIntervalDays: row.next_interval_days,
    previousEase: row.previous_ease,
    nextEase: row.next_ease,
    elapsedMs: row.elapsed_ms,
    answerRevealedAt: row.answer_revealed_at,
    note: row.note,
  };
}

export function buildReviewLogParams(log: ReviewLog): unknown[] {
  return [
    log.id,
    log.materialId,
    log.reviewedAt,
    log.rating,
    log.reviewMode,
    log.topicSlug,
    log.questionTypeSlugs.join(","),
    log.materialType,
    log.previousDueAt,
    log.nextDueAt,
    log.previousIntervalDays,
    log.nextIntervalDays,
    log.previousEase,
    log.nextEase,
    log.elapsedMs,
    log.answerRevealedAt,
    log.note,
  ];
}

function splitJoinedValues(value: string): readonly string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
