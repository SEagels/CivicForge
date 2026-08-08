import type { MaterialDraft } from "../materials/materialModel";
import {
  EMPTY_LEARNING_WORKSPACE,
  type KnowledgeCard,
  type LearningWorkspaceState,
  type ReviewCard,
} from "../../domain/learning";

export function createLearningWorkspaceFromMaterials(
  materials: readonly MaterialDraft[],
  base: LearningWorkspaceState = EMPTY_LEARNING_WORKSPACE,
): LearningWorkspaceState {
  const knownCards = new Set(base.cards.map((card) => card.id));
  const cards = [
    ...base.cards,
    ...materials.filter((material) => !knownCards.has(material.id)).map(mapMaterialToCard),
  ];
  const knownReviewCards = new Set(base.reviewCards.map((card) => card.knowledgeCardId));
  const reviewCards = [
    ...base.reviewCards,
    ...materials
      .filter((material) => material.status === "active" && material.reviewEnabled && !knownReviewCards.has(material.id))
      .map(mapMaterialToReviewCard),
  ];

  return { ...base, cards, reviewCards };
}

export function mapMaterialToCard(material: MaterialDraft): KnowledgeCard {
  return {
    id: material.id,
    title: material.title,
    contentMd: material.contentMd,
    summary: material.excerpt,
    cardType: material.materialType,
    topicSlug: material.topicSlug,
    lifecycle:
      material.status === "archived"
        ? "archived"
        : material.status === "draft"
          ? "refining"
          : material.favorite
            ? "core"
            : "usable",
    verificationStatus: material.status === "active" ? "user-verified" : "unverified",
    core: material.favorite,
    reviewEnabled: material.reviewEnabled,
    sourceLabel: material.source,
    tagNames: material.tagNames,
    questionTypeSlugs: material.questionTypeSlugs,
    createdAt: material.updatedAt,
    updatedAt: material.updatedAt,
  };
}

function mapMaterialToReviewCard(material: MaterialDraft): ReviewCard {
  return {
    id: `review-card-${material.id}`,
    knowledgeCardId: material.id,
    mode: "key-point-recall",
    promptMd: material.title,
    answerMd: material.contentMd,
    nextReviewAt: material.nextReviewAt,
    lastReviewedAt: material.lastReviewedAt,
    ease: material.reviewEase,
    intervalDays: material.reviewIntervalDays,
    repetitions: material.reviewRepetitions,
    lapses: material.reviewLapses,
  };
}
