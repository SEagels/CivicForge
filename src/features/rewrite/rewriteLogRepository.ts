import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { REWRITE_LOG_REPOSITORY_SQL } from "../../lib/db/rewriteLogRepositorySql";
import type { RewriteLog, RewriteLogStatus, RewriteTargetId } from "./rewriteWorkshop";

export interface RewriteLogRepositoryRow {
  readonly uuid: string;
  readonly source_material_uuid: string | null;
  readonly target_type: RewriteTargetId;
  readonly original_text: string;
  readonly prompt_template: string;
  readonly result_text: string;
  readonly status: RewriteLogStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface RewriteLogRepository {
  listRewriteLogs(): Promise<readonly RewriteLog[]>;
  saveRewriteLog(log: RewriteLog): Promise<void>;
  deleteRewriteLog(logId: string): Promise<void>;
  replaceRewriteLogs(logs: readonly RewriteLog[]): Promise<void>;
}

export function createRewriteLogRepository(db: CivicForgeDatabase): RewriteLogRepository {
  return {
    async listRewriteLogs() {
      const rows = await db.select<RewriteLogRepositoryRow[]>(REWRITE_LOG_REPOSITORY_SQL.listRewriteLogs);
      return rows.map(mapRewriteLogRow);
    },

    async saveRewriteLog(log) {
      await db.execute(REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog, buildRewriteLogParams(log));
    },

    async deleteRewriteLog(logId) {
      await db.execute(REWRITE_LOG_REPOSITORY_SQL.deleteRewriteLog, [logId]);
    },

    async replaceRewriteLogs(logs) {
      await db.execute(REWRITE_LOG_REPOSITORY_SQL.clearRewriteLogs);

      for (const log of logs) {
        await db.execute(REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog, buildRewriteLogParams(log));
      }
    },
  };
}

export function mapRewriteLogRow(row: RewriteLogRepositoryRow): RewriteLog {
  return {
    id: row.uuid,
    sourceMaterialId: row.source_material_uuid,
    targetId: row.target_type,
    originalText: row.original_text,
    promptTemplate: row.prompt_template,
    resultText: row.result_text,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildRewriteLogParams(log: RewriteLog): unknown[] {
  return [
    log.id,
    log.sourceMaterialId,
    log.targetId,
    log.originalText,
    log.promptTemplate,
    log.resultText,
    log.status,
    log.createdAt,
    log.updatedAt,
  ];
}
