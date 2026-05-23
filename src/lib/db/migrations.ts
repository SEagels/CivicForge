import { INITIAL_SCHEMA_SQL } from "./schema";

export interface DatabaseMigration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export const DATABASE_MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    sql: INITIAL_SCHEMA_SQL,
  },
  {
    version: 2,
    name: "rewrite_log_uuid",
    sql: `
ALTER TABLE rewrite_logs ADD COLUMN uuid TEXT NOT NULL DEFAULT '';
UPDATE rewrite_logs SET uuid = 'rewrite-db-' || id WHERE uuid = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_rewrite_logs_uuid ON rewrite_logs(uuid);
`.trim(),
  },
] as const satisfies readonly DatabaseMigration[];
