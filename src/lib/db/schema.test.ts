import { describe, expect, it } from "vitest";
import { INITIAL_SCHEMA_SQL, REQUIRED_TABLES } from "./schema";
import { DATABASE_MIGRATIONS } from "./migrations";
import {
  KNOWLEDGE_CARDS_MIGRATION_SQL,
  LEARNING_SEARCH_MIGRATION_SQL,
  MATERIALS_FTS_TRIGGER_FIX_SQL,
  REVIEW_CARDS_MIGRATION_SQL,
  SOURCE_AND_PRACTICE_MIGRATION_SQL,
} from "./learningMigrations";

describe("SQLite schema", () => {
  it("creates every required phase-one table", () => {
    for (const table of REQUIRED_TABLES) {
      expect(INITIAL_SCHEMA_SQL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("extends review logs for active recall statistics", () => {
    const migration = DATABASE_MIGRATIONS.find((item) => item.version === 3);

    expect(migration).toMatchObject({ version: 3, name: "review_log_active_recall" });
    expect(migration?.sql).toContain("ALTER TABLE review_logs ADD COLUMN uuid");
    expect(migration?.sql).toContain("review_mode TEXT NOT NULL DEFAULT 'active-recall'");
    expect(migration?.sql).toContain("topic_slug TEXT NOT NULL DEFAULT ''");
    expect(migration?.sql).toContain("question_type_slugs TEXT NOT NULL DEFAULT ''");
    expect(migration?.sql).toContain("material_type TEXT NOT NULL DEFAULT ''");
    expect(migration?.sql).toContain("answer_revealed_at TEXT NULL");
    expect(migration?.sql).toContain("idx_review_logs_mode_time");
  });

  it("defines the FTS5 search table and synchronization triggers", () => {
    expect(INITIAL_SCHEMA_SQL).toContain("CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5");
    expect(INITIAL_SCHEMA_SQL).toContain("materials_ai");
    expect(INITIAL_SCHEMA_SQL).toContain("materials_au");
    expect(INITIAL_SCHEMA_SQL).toContain("materials_ad");
  });

  it("adds indexes for review due queue and metadata filtering", () => {
    expect(INITIAL_SCHEMA_SQL).toContain("idx_materials_review_due");
    expect(INITIAL_SCHEMA_SQL).toContain("idx_materials_topic_id");
    expect(INITIAL_SCHEMA_SQL).toContain("idx_material_tags_tag_id");
    expect(INITIAL_SCHEMA_SQL).toContain("idx_material_question_types_question_type");
  });

  it("registers migrations with stable versions", () => {
    expect(DATABASE_MIGRATIONS.map((migration) => migration.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(DATABASE_MIGRATIONS[0]).toMatchObject({
      version: 1,
      name: "initial_schema",
    });
    expect(DATABASE_MIGRATIONS[0].sql).toBe(INITIAL_SCHEMA_SQL);
    expect(DATABASE_MIGRATIONS[1]).toMatchObject({
      version: 2,
      name: "rewrite_log_uuid",
    });
    expect(DATABASE_MIGRATIONS[1].sql).toContain("ALTER TABLE rewrite_logs ADD COLUMN uuid");
    expect(DATABASE_MIGRATIONS[2]).toMatchObject({
      version: 3,
      name: "review_log_active_recall",
    });
    expect(DATABASE_MIGRATIONS[3]).toMatchObject({ version: 4, name: "source_and_practice" });
    expect(DATABASE_MIGRATIONS[4]).toMatchObject({ version: 5, name: "knowledge_cards" });
    expect(DATABASE_MIGRATIONS[5]).toMatchObject({
      version: 6,
      name: "review_cards_and_study_sessions",
    });
    expect(DATABASE_MIGRATIONS[6]).toMatchObject({ version: 7, name: "learning_search_v2" });
    expect(DATABASE_MIGRATIONS[7]).toMatchObject({ version: 8, name: "fix_materials_fts_triggers" });
  });

  it("creates the v2 learning workflow tables without removing legacy tables", () => {
    for (const table of [
      "source_documents",
      "source_excerpts",
      "exercises",
      "attempts",
      "attempt_revisions",
      "feedback_records",
    ]) {
      expect(SOURCE_AND_PRACTICE_MIGRATION_SQL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }

    for (const table of ["knowledge_cards", "card_sources", "card_tags", "card_question_types", "card_usages"]) {
      expect(KNOWLEDGE_CARDS_MIGRATION_SQL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }

    for (const table of ["review_cards", "study_sessions", "study_session_items"]) {
      expect(REVIEW_CARDS_MIGRATION_SQL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }

    expect(KNOWLEDGE_CARDS_MIGRATION_SQL).toContain("FROM materials");
    expect(REVIEW_CARDS_MIGRATION_SQL).toContain("ALTER TABLE review_logs ADD COLUMN review_card_uuid");
    expect([...DATABASE_MIGRATIONS].every((migration) => !migration.sql.includes("DROP TABLE"))).toBe(true);
  });

  it("creates FTS5 indexes for sources, knowledge cards, and exercises", () => {
    expect(LEARNING_SEARCH_MIGRATION_SQL).toContain("source_documents_fts USING fts5");
    expect(LEARNING_SEARCH_MIGRATION_SQL).toContain("knowledge_cards_fts USING fts5");
    expect(LEARNING_SEARCH_MIGRATION_SQL).toContain("exercises_fts USING fts5");
  });

  it("repairs legacy material FTS triggers with normal row deletion", () => {
    expect(MATERIALS_FTS_TRIGGER_FIX_SQL).toContain("DELETE FROM materials_fts WHERE rowid = old.id");
    expect(MATERIALS_FTS_TRIGGER_FIX_SQL).not.toContain("VALUES ('delete'");
    expect(MATERIALS_FTS_TRIGGER_FIX_SQL).toContain("SELECT id, title, content_md, excerpt, search_keywords FROM materials");
  });
});
