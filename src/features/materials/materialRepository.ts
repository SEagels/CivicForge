import type { MaterialStatus, MaterialTypeId } from "../../domain/enums";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { MATERIAL_REPOSITORY_SQL } from "../../lib/db/materialRepositorySql";
import type { MaterialDraft } from "./materialModel";

export interface MaterialRepositoryRow {
  readonly uuid: string;
  readonly title: string;
  readonly content_md: string;
  readonly excerpt: string;
  readonly material_type: MaterialTypeId;
  readonly topic_slug: string | null;
  readonly source: string;
  readonly status: MaterialStatus;
  readonly favorite: number;
  readonly review_enabled: number;
  readonly review_ease: number;
  readonly review_interval_days: number;
  readonly review_repetitions: number;
  readonly review_lapses: number;
  readonly next_review_at: string | null;
  readonly last_reviewed_at: string | null;
  readonly updated_at: string;
  readonly tag_names: string;
  readonly question_type_slugs: string;
}

export interface MaterialRepository {
  listActiveMaterials(): Promise<readonly MaterialDraft[]>;
  searchMaterials(query: string): Promise<readonly MaterialDraft[]>;
  saveMaterial(material: MaterialDraft, nowIso?: string): Promise<void>;
  archiveMaterial(materialId: string, nowIso?: string): Promise<void>;
}

export function createMaterialRepository(db: CivicForgeDatabase): MaterialRepository {
  return {
    async listActiveMaterials() {
      const rows = await db.select<MaterialRepositoryRow[]>(MATERIAL_REPOSITORY_SQL.listActiveMaterials);
      return rows.map(mapMaterialRowToDraft);
    },

    async searchMaterials(query) {
      const rows = await db.select<MaterialRepositoryRow[]>(
        MATERIAL_REPOSITORY_SQL.searchMaterials,
        buildSearchMaterialParams(query),
      );
      return rows.map(mapMaterialRowToDraft);
    },

    async saveMaterial(material, nowIso = new Date().toISOString()) {
      await db.execute(MATERIAL_REPOSITORY_SQL.upsertMaterial, buildUpsertMaterialParams(material, nowIso));
      await replaceMaterialTags(db, material, nowIso);
      await replaceMaterialQuestionTypes(db, material, nowIso);
    },

    async archiveMaterial(materialId, nowIso = new Date().toISOString()) {
      await db.execute(MATERIAL_REPOSITORY_SQL.archiveMaterial, buildArchiveMaterialParams(materialId, nowIso));
    },
  };
}

export function mapMaterialRowToDraft(row: MaterialRepositoryRow): MaterialDraft {
  return {
    id: row.uuid,
    title: row.title,
    contentMd: row.content_md,
    excerpt: row.excerpt,
    materialType: row.material_type,
    topicSlug: row.topic_slug ?? "grassroots-governance",
    tagNames: splitJoinedValues(row.tag_names),
    questionTypeSlugs: splitJoinedValues(row.question_type_slugs),
    source: row.source,
    status: row.status,
    favorite: row.favorite === 1,
    reviewEnabled: row.review_enabled === 1,
    reviewEase: row.review_ease,
    reviewIntervalDays: row.review_interval_days,
    reviewRepetitions: row.review_repetitions,
    reviewLapses: row.review_lapses,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
    updatedAt: row.updated_at,
  };
}

export function buildSearchMaterialParams(query: string): unknown[] {
  const trimmed = query.trim();
  return [trimmed, `%${trimmed}%`];
}

export function buildArchiveMaterialParams(materialId: string, nowIso: string): unknown[] {
  return [nowIso, nowIso, materialId];
}

export function buildUpsertMaterialParams(material: MaterialDraft, nowIso: string): unknown[] {
  return [
    material.id,
    material.title,
    material.contentMd,
    material.excerpt,
    material.materialType,
    material.topicSlug,
    material.source,
    material.status,
    material.favorite ? 1 : 0,
    material.reviewEnabled ? 1 : 0,
    material.reviewEase,
    material.reviewIntervalDays,
    material.reviewRepetitions,
    material.reviewLapses,
    material.nextReviewAt,
    material.lastReviewedAt,
    countText(material.contentMd),
    buildSearchKeywords(material),
    nowIso,
    material.updatedAt,
  ];
}

export function createTagSlug(tagName: string): string {
  return tagName.trim().toLowerCase().replace(/\s+/g, "-");
}

async function replaceMaterialTags(db: CivicForgeDatabase, material: MaterialDraft, nowIso: string): Promise<void> {
  await db.execute(MATERIAL_REPOSITORY_SQL.deleteMaterialTags, [material.id]);

  for (const tagName of material.tagNames) {
    const trimmed = tagName.trim();

    if (!trimmed) {
      continue;
    }

    const slug = createTagSlug(trimmed);
    await db.execute(MATERIAL_REPOSITORY_SQL.upsertTagByName, [slug, trimmed, nowIso, nowIso]);
    await db.execute(MATERIAL_REPOSITORY_SQL.insertMaterialTagBySlug, [material.id, slug, nowIso]);
  }
}

async function replaceMaterialQuestionTypes(
  db: CivicForgeDatabase,
  material: MaterialDraft,
  nowIso: string,
): Promise<void> {
  await db.execute(MATERIAL_REPOSITORY_SQL.deleteMaterialQuestionTypes, [material.id]);

  for (const questionTypeSlug of material.questionTypeSlugs) {
    await db.execute(MATERIAL_REPOSITORY_SQL.insertMaterialQuestionTypeBySlug, [
      material.id,
      questionTypeSlug,
      nowIso,
    ]);
  }
}

function splitJoinedValues(value: string): readonly string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function countText(value: string): number {
  return value.replace(/\s+/g, "").length;
}

function buildSearchKeywords(material: MaterialDraft): string {
  return [
    material.title,
    material.excerpt,
    material.source,
    material.topicSlug,
    material.materialType,
    ...material.tagNames,
    ...material.questionTypeSlugs,
  ]
    .filter(Boolean)
    .join(" ");
}
