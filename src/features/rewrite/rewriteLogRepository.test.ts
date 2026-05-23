import { describe, expect, it } from "vitest";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { REWRITE_LOG_REPOSITORY_SQL } from "../../lib/db/rewriteLogRepositorySql";
import {
  buildRewriteLogParams,
  createRewriteLogRepository,
  mapRewriteLogRow,
  type RewriteLogRepositoryRow,
} from "./rewriteLogRepository";
import type { RewriteLog } from "./rewriteWorkshop";

describe("rewrite log repository", () => {
  it("maps SQLite rows into rewrite logs", () => {
    const row: RewriteLogRepositoryRow = {
      uuid: "rewrite-1",
      source_material_uuid: "mat-1",
      target_type: "compress",
      original_text: "raw",
      prompt_template: "prompt",
      result_text: "result",
      status: "saved",
      created_at: "2026-05-23T10:00:00.000Z",
      updated_at: "2026-05-23T10:01:00.000Z",
    };

    expect(mapRewriteLogRow(row)).toEqual({
      id: "rewrite-1",
      sourceMaterialId: "mat-1",
      targetId: "compress",
      originalText: "raw",
      promptTemplate: "prompt",
      resultText: "result",
      status: "saved",
      createdAt: "2026-05-23T10:00:00.000Z",
      updatedAt: "2026-05-23T10:01:00.000Z",
    });
  });

  it("builds positional upsert params", () => {
    const log = createLog();

    expect(buildRewriteLogParams(log)).toEqual([
      "rewrite-1",
      "mat-1",
      "compress",
      "raw",
      "prompt",
      "result",
      "saved",
      "2026-05-23T10:00:00.000Z",
      "2026-05-23T10:01:00.000Z",
    ]);
  });

  it("lists, saves, deletes, and replaces rewrite logs through SQL statements", async () => {
    const db = createFakeDb([
      {
        uuid: "rewrite-1",
        source_material_uuid: null,
        target_type: "title",
        original_text: "old",
        prompt_template: "prompt",
        result_text: "title",
        status: "saved",
        created_at: "2026-05-23T10:00:00.000Z",
        updated_at: "2026-05-23T10:00:00.000Z",
      },
    ]);
    const repository = createRewriteLogRepository(db);

    await expect(repository.listRewriteLogs()).resolves.toHaveLength(1);
    await repository.saveRewriteLog(createLog());
    await repository.deleteRewriteLog("rewrite-1");
    await repository.replaceRewriteLogs([createLog({ id: "rewrite-2" })]);

    expect(db.selectedSql).toEqual([REWRITE_LOG_REPOSITORY_SQL.listRewriteLogs]);
    expect(db.executedSql).toEqual([
      REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog,
      REWRITE_LOG_REPOSITORY_SQL.deleteRewriteLog,
      REWRITE_LOG_REPOSITORY_SQL.clearRewriteLogs,
      REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog,
    ]);
  });
});

function createLog(patch: Partial<RewriteLog> = {}): RewriteLog {
  return {
    id: "rewrite-1",
    sourceMaterialId: "mat-1",
    targetId: "compress",
    originalText: "raw",
    promptTemplate: "prompt",
    resultText: "result",
    status: "saved",
    createdAt: "2026-05-23T10:00:00.000Z",
    updatedAt: "2026-05-23T10:01:00.000Z",
    ...patch,
  };
}

function createFakeDb(rows: readonly RewriteLogRepositoryRow[]) {
  const executedSql: string[] = [];
  const selectedSql: string[] = [];
  const db: CivicForgeDatabase & { executedSql: string[]; selectedSql: string[] } = {
    executedSql,
    selectedSql,
    execute: async (query) => {
      executedSql.push(query);
      return { rowsAffected: 1 };
    },
    select: async <T,>(query: string): Promise<T> => {
      selectedSql.push(query);
      return rows as T;
    },
    close: async () => true,
  };

  return db;
}
