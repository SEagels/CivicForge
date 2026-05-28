import { describe, expect, it } from "vitest";
import { INITIAL_SCHEMA_SQL, REQUIRED_TABLES } from "./schema";
import { DATABASE_MIGRATIONS } from "./migrations";

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
    expect(DATABASE_MIGRATIONS.map((migration) => migration.version)).toEqual([1, 2, 3]);
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
  });
});
