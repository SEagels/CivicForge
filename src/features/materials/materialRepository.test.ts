import { describe, expect, it } from "vitest";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { MATERIAL_REPOSITORY_SQL } from "../../lib/db/materialRepositorySql";
import {
  buildArchiveMaterialParams,
  buildSearchMaterialParams,
  buildUpsertMaterialParams,
  createMaterialRepository,
  createTagSlug,
  mapMaterialRowToDraft,
  type MaterialRepositoryRow,
} from "./materialRepository";
import { createInitialMaterialState } from "./materialModel";

describe("material repository", () => {
  it("maps SQLite rows into material drafts", () => {
    const row: MaterialRepositoryRow = {
      uuid: "mat-1",
      title: "标题",
      content_md: "正文",
      excerpt: "摘要",
      material_type: "standard-expression",
      topic_slug: "grassroots-governance",
      source: "来源",
      status: "active",
      favorite: 1,
      review_enabled: 1,
      review_ease: 2.4,
      review_interval_days: 3,
      review_repetitions: 2,
      review_lapses: 1,
      next_review_at: "2026-05-24T08:00:00.000Z",
      last_reviewed_at: "2026-05-23T08:00:00.000Z",
      updated_at: "2026-05-23T08:00:00.000Z",
      tag_names: "网格化,基层服务",
      question_type_slugs: "implementation,essay",
    };

    expect(mapMaterialRowToDraft(row)).toMatchObject({
      id: "mat-1",
      title: "标题",
      favorite: true,
      reviewEnabled: true,
      tagNames: ["网格化", "基层服务"],
      questionTypeSlugs: ["implementation", "essay"],
      reviewEase: 2.4,
    });
  });

  it("builds positional upsert params for Tauri SQL", () => {
    const material = createInitialMaterialState().materials[0];
    const params = buildUpsertMaterialParams(material, "2026-05-23T08:00:00.000Z");

    expect(params).toHaveLength(20);
    expect(params[0]).toBe(material.id);
    expect(params[1]).toBe(material.title);
    expect(params[5]).toBe(material.topicSlug);
    expect(params[8]).toBe(1);
    expect(params[9]).toBe(1);
    expect(params[16]).toBe(material.contentMd.replace(/\s+/g, "").length);
    expect(params[19]).toBe(material.updatedAt);
  });

  it("builds search and archive params", () => {
    expect(buildSearchMaterialParams(" 数字政府 ")).toEqual(["数字政府", "%数字政府%"]);
    expect(buildArchiveMaterialParams("mat-1", "2026-05-23T08:00:00.000Z")).toEqual([
      "2026-05-23T08:00:00.000Z",
      "2026-05-23T08:00:00.000Z",
      "mat-1",
    ]);
  });

  it("creates stable tag slugs without rejecting Chinese tags", () => {
    expect(createTagSlug(" 网格化 ")).toBe("网格化");
    expect(createTagSlug("Public Service")).toBe("public-service");
  });

  it("lists, searches, saves, and archives through SQL statements", async () => {
    const db = createFakeDb([
      {
        uuid: "mat-1",
        title: "标题",
        content_md: "正文",
        excerpt: "摘要",
        material_type: "standard-expression",
        topic_slug: "grassroots-governance",
        source: "",
        status: "active",
        favorite: 0,
        review_enabled: 1,
        review_ease: 2.5,
        review_interval_days: 0,
        review_repetitions: 0,
        review_lapses: 0,
        next_review_at: null,
        last_reviewed_at: null,
        updated_at: "2026-05-23T08:00:00.000Z",
        tag_names: "",
        question_type_slugs: "general",
      },
    ]);
    const repository = createMaterialRepository(db);
    const material = createInitialMaterialState().materials[0];

    await expect(repository.listActiveMaterials()).resolves.toHaveLength(1);
    await expect(repository.searchMaterials("标题")).resolves.toHaveLength(1);
    await repository.saveMaterial(material, "2026-05-23T08:00:00.000Z");
    await repository.archiveMaterial(material.id, "2026-05-23T08:00:00.000Z");

    expect(db.selectedSql).toContain(MATERIAL_REPOSITORY_SQL.listActiveMaterials);
    expect(db.selectedSql).toContain(MATERIAL_REPOSITORY_SQL.searchMaterials);
    expect(db.executedSql).toContain(MATERIAL_REPOSITORY_SQL.upsertMaterial);
    expect(db.executedSql).toContain(MATERIAL_REPOSITORY_SQL.archiveMaterial);
    expect(db.executedSql).toContain(MATERIAL_REPOSITORY_SQL.upsertTagByName);
  });
});

function createFakeDb(rows: readonly MaterialRepositoryRow[]) {
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
