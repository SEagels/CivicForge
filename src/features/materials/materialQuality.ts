import { MATERIAL_TYPE_IDS } from "../../domain/enums";
import type { MaterialDraft } from "./materialModel";

export const MATERIAL_QUALITY_REQUIRED_CHECK_IDS = [
  "title",
  "content",
  "credible-source",
  "tags",
  "specific-question-type",
] as const;

export type MaterialQualityRequiredCheckId = (typeof MATERIAL_QUALITY_REQUIRED_CHECK_IDS)[number];
export type MaterialQualityLevel = "candidate" | "refining" | "approved" | "core";

export interface MaterialQualityCheck {
  readonly id: MaterialQualityRequiredCheckId;
  readonly label: string;
  readonly passed: boolean;
}

export interface MaterialQualityReport {
  readonly score: number;
  readonly level: MaterialQualityLevel;
  readonly reviewAllowed: boolean;
  readonly checks: readonly MaterialQualityCheck[];
  readonly failedRequiredChecks: readonly MaterialQualityRequiredCheckId[];
}

const REUSABLE_MATERIAL_TYPES = new Set([
  "solution",
  "case",
  "standard-expression",
  "golden-sentence",
  "title-sentence",
  "transition-sentence",
  "essay-framework",
  "argument",
  "opening",
  "ending",
]);

export function getMaterialQualityReport(material: MaterialDraft): MaterialQualityReport {
  const checks = buildQualityChecks(material);
  const failedRequiredChecks = checks.filter((check) => !check.passed).map((check) => check.id);
  const score = Math.min(
    100,
    scoreSource(material) +
      scoreEssayFit(material) +
      scoreExpression(material) +
      scoreReuse(material) +
      scoreSpecificity(material),
  );
  const level = getQualityLevel(score, material.favorite, failedRequiredChecks.length > 0);

  return {
    score,
    level,
    reviewAllowed: score >= 70 && failedRequiredChecks.length === 0,
    checks,
    failedRequiredChecks,
  };
}

export function canMaterialEnterReview(material: MaterialDraft): boolean {
  return getMaterialQualityReport(material).reviewAllowed;
}

export function getPotentialDuplicateMaterials(
  material: MaterialDraft,
  materials: readonly MaterialDraft[],
): readonly MaterialDraft[] {
  const title = normalizeComparableText(material.title);
  const content = normalizeComparableText(material.contentMd);

  return materials.filter((candidate) => {
    if (candidate.id === material.id) {
      return false;
    }

    const candidateTitle = normalizeComparableText(candidate.title);
    const candidateContent = normalizeComparableText(candidate.contentMd);

    return Boolean(
      (title && candidateTitle === title) ||
        (content && candidateContent === content) ||
        (content.length >= 24 && candidateContent.includes(content)) ||
        (candidateContent.length >= 24 && content.includes(candidateContent)),
    );
  });
}

function buildQualityChecks(material: MaterialDraft): readonly MaterialQualityCheck[] {
  return [
    {
      id: "title",
      label: "标题明确",
      passed: hasGoodTitle(material.title),
    },
    {
      id: "content",
      label: "正文可调用",
      passed: countText(material.contentMd) >= 12,
    },
    {
      id: "credible-source",
      label: "来源可信",
      passed: hasCredibleSource(material.source),
    },
    {
      id: "tags",
      label: "标签完整",
      passed: material.tagNames.length > 0,
    },
    {
      id: "specific-question-type",
      label: "题型具体",
      passed: hasSpecificQuestionType(material.questionTypeSlugs),
    },
  ];
}

function scoreSource(material: MaterialDraft): number {
  const source = material.source.trim();

  if (!source) {
    return 0;
  }

  return isModelOnlySource(source) ? 6 : 20;
}

function scoreEssayFit(material: MaterialDraft): number {
  let score = 0;

  if (material.topicSlug.trim()) {
    score += 6;
  }

  if (MATERIAL_TYPE_IDS.includes(material.materialType)) {
    score += 7;
  }

  if (material.questionTypeSlugs.length > 0) {
    score += 5;
  }

  if (hasSpecificQuestionType(material.questionTypeSlugs)) {
    score += 7;
  }

  return score;
}

function scoreExpression(material: MaterialDraft): number {
  const textCount = countText(material.contentMd);
  let score = 0;

  if (hasGoodTitle(material.title)) {
    score += 5;
  }

  if (textCount >= 12 && textCount <= 260) {
    score += 17;
  } else if (textCount > 260) {
    score += 10;
  } else if (textCount > 0) {
    score += 4;
  }

  if (material.excerpt.trim()) {
    score += 3;
  }

  return score;
}

function scoreReuse(material: MaterialDraft): number {
  let score = 0;

  if (material.tagNames.length > 0) {
    score += 6;
  }

  if (material.questionTypeSlugs.filter((slug) => slug !== "general").length >= 2) {
    score += 8;
  } else if (hasSpecificQuestionType(material.questionTypeSlugs)) {
    score += 4;
  }

  if (REUSABLE_MATERIAL_TYPES.has(material.materialType)) {
    score += 6;
  }

  return score;
}

function scoreSpecificity(material: MaterialDraft): number {
  let score = 0;

  if (countText(material.contentMd) >= 24) {
    score += 5;
  }

  if (material.tagNames.length >= 2 || hasCredibleSource(material.source)) {
    score += 5;
  }

  return score;
}

function getQualityLevel(score: number, favorite: boolean, hasRequiredFailures: boolean): MaterialQualityLevel {
  if (score < 40) {
    return "candidate";
  }

  if (score < 70 || hasRequiredFailures) {
    return "refining";
  }

  return favorite && score >= 85 ? "core" : "approved";
}

function hasGoodTitle(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length > 0 && !trimmed.includes("未命名");
}

function hasCredibleSource(source: string): boolean {
  const trimmed = source.trim();
  return trimmed.length > 0 && !isModelOnlySource(trimmed);
}

function isModelOnlySource(source: string): boolean {
  const normalized = source.toLowerCase();
  return normalized.includes("rewrite") || normalized.includes("ai") || normalized.includes("模型");
}

function hasSpecificQuestionType(questionTypeSlugs: readonly string[]): boolean {
  return questionTypeSlugs.some((slug) => slug !== "general");
}

function countText(value: string): number {
  return value.replace(/\s+/g, "").length;
}

function normalizeComparableText(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}
