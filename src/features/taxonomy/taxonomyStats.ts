import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import { getDueReviewMaterials } from "../review/reviewScheduler";
import type { MaterialDraft } from "../materials/materialModel";

export interface DashboardStats {
  readonly totalCount: number;
  readonly activeCount: number;
  readonly archivedCount: number;
  readonly favoriteCount: number;
  readonly reviewEnabledCount: number;
  readonly dueReviewCount: number;
  readonly rewriteLogCount: number;
  readonly tagCount: number;
}

export interface TaxonomyCount {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly count: number;
}

export function getDashboardStats(
  materials: readonly MaterialDraft[],
  rewriteLogCount: number,
  now: Date = new Date(),
): DashboardStats {
  const visibleMaterials = materials.filter(isVisibleMaterial);

  return {
    totalCount: materials.length,
    activeCount: visibleMaterials.length,
    archivedCount: materials.filter((material) => material.status === "archived").length,
    favoriteCount: visibleMaterials.filter((material) => material.favorite).length,
    reviewEnabledCount: visibleMaterials.filter((material) => material.reviewEnabled).length,
    dueReviewCount: getDueReviewMaterials(visibleMaterials, now).length,
    rewriteLogCount,
    tagCount: getTagStats(visibleMaterials).length,
  };
}

export function getTopicStats(materials: readonly MaterialDraft[]): readonly TaxonomyCount[] {
  const visibleMaterials = materials.filter(isVisibleMaterial);

  return BUILTIN_TOPICS.map((topic) => ({
    id: topic.slug,
    name: topic.name,
    description: topic.description,
    count: visibleMaterials.filter((material) => material.topicSlug === topic.slug).length,
  }));
}

export function getMaterialTypeStats(materials: readonly MaterialDraft[]): readonly TaxonomyCount[] {
  const visibleMaterials = materials.filter(isVisibleMaterial);

  return BUILTIN_MATERIAL_TYPES.map((materialType) => ({
    id: materialType.id,
    name: materialType.name,
    description: materialType.description,
    count: visibleMaterials.filter((material) => material.materialType === materialType.id).length,
  }));
}

export function getQuestionTypeStats(materials: readonly MaterialDraft[]): readonly TaxonomyCount[] {
  const visibleMaterials = materials.filter(isVisibleMaterial);

  return BUILTIN_QUESTION_TYPES.map((questionType) => ({
    id: questionType.slug,
    name: questionType.name,
    description: questionType.description,
    count: visibleMaterials.filter((material) => material.questionTypeSlugs.includes(questionType.slug)).length,
  }));
}

export function getTagStats(materials: readonly MaterialDraft[]): readonly TaxonomyCount[] {
  const tagCounts = new Map<string, number>();

  for (const material of materials.filter(isVisibleMaterial)) {
    const materialTags = new Set(material.tagNames.map((tagName) => tagName.trim()).filter(Boolean));

    for (const tagName of materialTags) {
      tagCounts.set(tagName, (tagCounts.get(tagName) ?? 0) + 1);
    }
  }

  return [...tagCounts.entries()]
    .map(([name, count]) => ({
      id: name,
      name,
      count,
    }))
    .sort(compareTaxonomyNames);
}

function isVisibleMaterial(material: MaterialDraft): boolean {
  return material.status === "active" || material.status === "draft";
}

function compareTaxonomyNames(left: TaxonomyCount, right: TaxonomyCount): number {
  const normalizedOrder = left.name
    .toLocaleLowerCase("zh-CN")
    .localeCompare(right.name.toLocaleLowerCase("zh-CN"), "zh-CN");

  if (normalizedOrder !== 0) {
    return normalizedOrder;
  }

  return right.name.localeCompare(left.name, "zh-CN");
}
