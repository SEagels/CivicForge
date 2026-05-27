import type { MaterialTypeId } from "../../domain/enums";
import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft } from "./materialModel";
import { isWorkbenchCandidate } from "./materialWorkbench";

export interface MaterialFilters {
  readonly query: string;
  readonly topicSlug: string;
  readonly materialType: MaterialTypeId | "";
  readonly questionTypeSlug: string;
  readonly tagName: string;
  readonly favoriteOnly: boolean;
  readonly reviewOnly: boolean;
  readonly workbenchOnly: boolean;
}

export const DEFAULT_MATERIAL_FILTERS: MaterialFilters = {
  query: "",
  topicSlug: "",
  materialType: "",
  questionTypeSlug: "",
  tagName: "",
  favoriteOnly: false,
  reviewOnly: false,
  workbenchOnly: false,
};

const topicNameBySlug: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));
const typeNameBySlug: ReadonlyMap<string, string> = new Map(
  BUILTIN_MATERIAL_TYPES.map((type) => [type.slug, type.name]),
);
const questionTypeNameBySlug: ReadonlyMap<string, string> = new Map(
  BUILTIN_QUESTION_TYPES.map((type) => [type.slug, type.name]),
);

export function filterMaterials(
  materials: readonly MaterialDraft[],
  filters: MaterialFilters,
): readonly MaterialDraft[] {
  const query = normalize(filters.query);

  return materials.filter((material) => {
    if (filters.topicSlug && material.topicSlug !== filters.topicSlug) {
      return false;
    }

    if (filters.materialType && material.materialType !== filters.materialType) {
      return false;
    }

    if (filters.questionTypeSlug && !material.questionTypeSlugs.includes(filters.questionTypeSlug)) {
      return false;
    }

    if (filters.tagName && !material.tagNames.includes(filters.tagName)) {
      return false;
    }

    if (filters.favoriteOnly && !material.favorite) {
      return false;
    }

    if (filters.reviewOnly && !material.reviewEnabled) {
      return false;
    }

    if (filters.workbenchOnly && !isWorkbenchCandidate(material)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return buildSearchText(material).includes(query);
  });
}

export function getAvailableTags(materials: readonly MaterialDraft[]): readonly string[] {
  return [...new Set(materials.flatMap((material) => material.tagNames))].sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

export function hasActiveFilters(filters: MaterialFilters): boolean {
  return (
    Boolean(filters.query.trim()) ||
    Boolean(filters.topicSlug) ||
    Boolean(filters.materialType) ||
    Boolean(filters.questionTypeSlug) ||
    Boolean(filters.tagName) ||
    filters.favoriteOnly ||
    filters.reviewOnly ||
    filters.workbenchOnly
  );
}

function buildSearchText(material: MaterialDraft): string {
  const questionTypeNames = material.questionTypeSlugs.map((slug) => questionTypeNameBySlug.get(slug) ?? slug);

  return normalize(
    [
      material.title,
      material.contentMd,
      material.excerpt,
      material.source,
      material.topicSlug,
      topicNameBySlug.get(material.topicSlug),
      material.materialType,
      typeNameBySlug.get(material.materialType),
      ...material.tagNames,
      ...material.questionTypeSlugs,
      ...questionTypeNames,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN");
}
