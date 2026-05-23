import { describe, expect, it } from "vitest";
import { MATERIAL_REPOSITORY_SQL, MATERIAL_REPOSITORY_STATEMENTS } from "./materialRepositorySql";

describe("material repository SQL assets", () => {
  it("exports the complete statement set needed by the material library", () => {
    expect(MATERIAL_REPOSITORY_STATEMENTS).toEqual([
      "listActiveMaterials",
      "searchMaterials",
      "upsertMaterial",
      "archiveMaterial",
      "upsertTagByName",
      "deleteMaterialTags",
      "insertMaterialTagBySlug",
      "deleteMaterialQuestionTypes",
      "insertMaterialQuestionTypeBySlug",
    ]);
  });

  it("lists active and draft materials with topic, tags, and question types", () => {
    const sql = MATERIAL_REPOSITORY_SQL.listActiveMaterials;

    expect(sql).toContain("FROM materials AS m");
    expect(sql).toContain("LEFT JOIN topics AS topic");
    expect(sql).toContain("LEFT JOIN material_tags AS mt");
    expect(sql).toContain("LEFT JOIN tags AS tag");
    expect(sql).toContain("LEFT JOIN material_question_types AS mqt");
    expect(sql).toContain("LEFT JOIN question_types AS question_type");
    expect(sql).toContain("m.status IN ('active', 'draft')");
    expect(sql).toContain("ORDER BY m.updated_at DESC");
  });

  it("searches with FTS5 and keeps a Chinese-friendly LIKE fallback", () => {
    const sql = MATERIAL_REPOSITORY_SQL.searchMaterials;

    expect(sql).toContain("materials_fts");
    expect(sql).toContain("MATCH $1");
    expect(sql).toContain("LIKE $2");
    expect(sql).toContain("UNION");
    expect(sql).toContain("m.status IN ('active', 'draft')");
  });

  it("upserts the material core fields by uuid", () => {
    const sql = MATERIAL_REPOSITORY_SQL.upsertMaterial;

    expect(sql).toContain("INSERT INTO materials");
    expect(sql).toContain("uuid");
    expect(sql).toContain("ON CONFLICT(uuid) DO UPDATE SET");
    expect(sql).toContain("review_enabled = excluded.review_enabled");
    expect(sql).toContain("updated_at = excluded.updated_at");
    expect(sql).toContain("$1");
    expect(sql).toContain("$20");
  });

  it("archives materials without deleting their review or rewrite history", () => {
    const sql = MATERIAL_REPOSITORY_SQL.archiveMaterial;

    expect(sql).toContain("UPDATE materials");
    expect(sql).toContain("status = 'archived'");
    expect(sql).toContain("deleted_at = $1");
    expect(sql).toContain("WHERE uuid = $3");
  });

  it("upserts free-form tags before replacing tag links", () => {
    const sql = MATERIAL_REPOSITORY_SQL.upsertTagByName;

    expect(sql).toContain("INSERT INTO tags");
    expect(sql).toContain("ON CONFLICT(slug) DO UPDATE SET");
    expect(sql).toContain("name = excluded.name");
  });

  it("replaces many-to-many tag and question type links by material uuid", () => {
    expect(MATERIAL_REPOSITORY_SQL.deleteMaterialTags).toContain("DELETE FROM material_tags");
    expect(MATERIAL_REPOSITORY_SQL.deleteMaterialTags).toContain("SELECT id FROM materials WHERE uuid = $1");
    expect(MATERIAL_REPOSITORY_SQL.insertMaterialTagBySlug).toContain("INSERT OR IGNORE INTO material_tags");
    expect(MATERIAL_REPOSITORY_SQL.insertMaterialTagBySlug).toContain("SELECT material.id, tag.id");
    expect(MATERIAL_REPOSITORY_SQL.insertMaterialTagBySlug).toContain("tag.slug = $2");

    expect(MATERIAL_REPOSITORY_SQL.deleteMaterialQuestionTypes).toContain("DELETE FROM material_question_types");
    expect(MATERIAL_REPOSITORY_SQL.deleteMaterialQuestionTypes).toContain(
      "SELECT id FROM materials WHERE uuid = $1",
    );
    expect(MATERIAL_REPOSITORY_SQL.insertMaterialQuestionTypeBySlug).toContain(
      "INSERT OR IGNORE INTO material_question_types",
    );
    expect(MATERIAL_REPOSITORY_SQL.insertMaterialQuestionTypeBySlug).toContain(
      "question_type.slug = $2",
    );
  });
});
