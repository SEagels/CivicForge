import { BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { CivicForgeDatabase } from "./databaseClient";
import { DATABASE_MIGRATIONS } from "./migrations";

export const MIGRATION_VERSION_SELECT_SQL = "SELECT version FROM schema_migrations ORDER BY version ASC;";

export const MIGRATION_TABLE_SQL =
  "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL DEFAULT '', applied_at TEXT NOT NULL);";

export const MIGRATION_RECORD_SQL = `
INSERT OR IGNORE INTO schema_migrations (version, name, checksum, applied_at)
VALUES ($1, $2, $3, $4);
`.trim();

export const TOPIC_SEED_SQL = `
INSERT INTO topics (slug, name, description, is_builtin, sort_order, created_at, updated_at)
VALUES ($1, $2, $3, 1, $4, $5, $6)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  is_builtin = 1,
  sort_order = excluded.sort_order,
  updated_at = excluded.updated_at;
`.trim();

export const QUESTION_TYPE_SEED_SQL = `
INSERT INTO question_types (slug, name, description, is_builtin, sort_order, created_at, updated_at)
VALUES ($1, $2, $3, 1, $4, $5, $6)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  is_builtin = 1,
  sort_order = excluded.sort_order,
  updated_at = excluded.updated_at;
`.trim();

interface AppliedMigrationRow {
  readonly version: number;
}

export async function initializeCivicForgeDatabase(db: CivicForgeDatabase, now: Date = new Date()): Promise<void> {
  await db.execute(MIGRATION_TABLE_SQL);
  const appliedRows = await db.select<AppliedMigrationRow[]>(MIGRATION_VERSION_SELECT_SQL);
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  for (const migration of DATABASE_MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    await executeSqlBatch(db, migration.sql);
    await db.execute(MIGRATION_RECORD_SQL, [
      migration.version,
      migration.name,
      createMigrationChecksum(migration.sql),
      now.toISOString(),
    ]);
  }

  await seedBuiltinTaxonomy(db, now);
}

export async function seedBuiltinTaxonomy(db: CivicForgeDatabase, now: Date = new Date()): Promise<void> {
  const timestamp = now.toISOString();

  for (const topic of BUILTIN_TOPICS) {
    await db.execute(TOPIC_SEED_SQL, [topic.slug, topic.name, topic.description, topic.sortOrder, timestamp, timestamp]);
  }

  for (const questionType of BUILTIN_QUESTION_TYPES) {
    await db.execute(QUESTION_TYPE_SEED_SQL, [
      questionType.slug,
      questionType.name,
      questionType.description,
      questionType.sortOrder,
      timestamp,
      timestamp,
    ]);
  }
}

export async function executeSqlBatch(db: CivicForgeDatabase, sql: string): Promise<void> {
  for (const statement of splitSqlStatements(sql)) {
    await db.execute(statement);
  }
}

export function splitSqlStatements(sql: string): readonly string[] {
  const statements: string[] = [];
  const lines = sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  let current: string[] = [];
  let insideTrigger = false;

  for (const line of lines) {
    current.push(line);

    if (/^CREATE\s+TRIGGER\b/i.test(line)) {
      insideTrigger = true;
    }

    if (insideTrigger) {
      if (/^END;$/i.test(line)) {
        statements.push(current.join("\n"));
        current = [];
        insideTrigger = false;
      }
      continue;
    }

    if (line.endsWith(";")) {
      statements.push(current.join("\n"));
      current = [];
    }
  }

  if (current.length > 0) {
    statements.push(current.join("\n"));
  }

  return statements;
}

function createMigrationChecksum(sql: string): string {
  return `${sql.length}:${hashString(sql)}`;
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
