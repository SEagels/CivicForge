import { describe, expect, it } from "vitest";
import { BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { CivicForgeDatabase } from "./databaseClient";
import {
  initializeCivicForgeDatabase,
  splitSqlStatements,
  TOPIC_SEED_SQL,
  QUESTION_TYPE_SEED_SQL,
} from "./databaseInitializer";
import { INITIAL_SCHEMA_SQL } from "./schema";

describe("database initializer", () => {
  it("splits schema SQL without breaking trigger bodies", () => {
    const statements = splitSqlStatements(INITIAL_SCHEMA_SQL);

    expect(statements.some((statement) => statement.includes("CREATE TRIGGER IF NOT EXISTS materials_ai"))).toBe(true);
    expect(statements.some((statement) => statement.includes("END;"))).toBe(true);
    expect(statements.filter((statement) => statement.includes("VALUES ('delete'"))).toHaveLength(2);
  });

  it("applies pending migrations and records the migration version", async () => {
    const db = createFakeDb([]);

    await initializeCivicForgeDatabase(db, new Date("2026-05-23T08:00:00.000Z"));

    expect(db.executedSql[0]).toContain("CREATE TABLE IF NOT EXISTS schema_migrations");
    expect(db.executedSql).toContain("BEGIN IMMEDIATE;");
    expect(db.executedSql).toContain("COMMIT;");
    expect(db.executedSql.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS materials"))).toBe(true);
    expect(db.executedSql.some((sql) => sql.includes("INSERT OR IGNORE INTO schema_migrations"))).toBe(true);
  });

  it("skips already applied migrations but still seeds built-in taxonomy", async () => {
    const db = createFakeDb([{ version: 1 }]);

    await initializeCivicForgeDatabase(db, new Date("2026-05-23T08:00:00.000Z"));

    expect(db.executedSql.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS materials"))).toBe(false);
    expect(db.executedSql.filter((sql) => sql === TOPIC_SEED_SQL)).toHaveLength(BUILTIN_TOPICS.length);
    expect(db.executedSql.filter((sql) => sql === QUESTION_TYPE_SEED_SQL)).toHaveLength(BUILTIN_QUESTION_TYPES.length);
  });

  it("rolls back a migration when one of its statements fails", async () => {
    const db = createFakeDb([], "CREATE TABLE IF NOT EXISTS materials");

    await expect(initializeCivicForgeDatabase(db)).rejects.toThrow("forced migration failure");

    expect(db.executedSql).toContain("BEGIN IMMEDIATE;");
    expect(db.executedSql).toContain("ROLLBACK;");
    expect(db.executedSql).not.toContain("COMMIT;");
    expect(db.executedSql.some((sql) => sql.includes("INSERT OR IGNORE INTO schema_migrations"))).toBe(false);
  });

  it("rejects an applied migration whose checksum no longer matches", async () => {
    const db = createFakeDb([{ version: 1, checksum: "stale-checksum" }]);

    await expect(initializeCivicForgeDatabase(db)).rejects.toThrow("checksum does not match");
    expect(db.executedSql).not.toContain("BEGIN IMMEDIATE;");
  });
});

function createFakeDb(
  appliedVersions: readonly { version: number; checksum?: string }[],
  failOnSql?: string,
) {
  const executedSql: string[] = [];
  const bindValues: unknown[][] = [];
  const db: CivicForgeDatabase & { executedSql: string[]; bindValues: unknown[][] } = {
    executedSql,
    bindValues,
    execute: async (query, binds = []) => {
      executedSql.push(query);
      bindValues.push(binds);
      if (failOnSql && query.includes(failOnSql)) {
        throw new Error("forced migration failure");
      }
      return { rowsAffected: 1 };
    },
    select: async <T,>(query: string): Promise<T> => {
      executedSql.push(query);
      return appliedVersions as T;
    },
    close: async () => true,
  };

  return db;
}
