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
  {
    version: 3,
    name: "review_log_active_recall",
    sql: `
ALTER TABLE review_logs ADD COLUMN uuid TEXT NOT NULL DEFAULT '';
UPDATE review_logs SET uuid = 'review-db-' || id WHERE uuid = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_logs_uuid ON review_logs(uuid);
ALTER TABLE review_logs ADD COLUMN review_mode TEXT NOT NULL DEFAULT 'active-recall';
ALTER TABLE review_logs ADD COLUMN topic_slug TEXT NOT NULL DEFAULT '';
ALTER TABLE review_logs ADD COLUMN question_type_slugs TEXT NOT NULL DEFAULT '';
ALTER TABLE review_logs ADD COLUMN material_type TEXT NOT NULL DEFAULT '';
ALTER TABLE review_logs ADD COLUMN answer_revealed_at TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_review_logs_mode_time ON review_logs(review_mode, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_topic_time ON review_logs(topic_slug, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_material_type_time ON review_logs(material_type, reviewed_at DESC);
`.trim(),
  },
] as const satisfies readonly DatabaseMigration[];
