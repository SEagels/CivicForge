import type { MaterialTypeId, ReviewRating } from "./enums";

export const SOURCE_DOCUMENT_TYPES = ["article", "policy", "exercise-material", "model-answer", "note"] as const;
export type SourceDocumentType = (typeof SOURCE_DOCUMENT_TYPES)[number];

export const LEARNING_ITEM_STATUSES = ["draft", "active", "completed", "archived"] as const;
export type LearningItemStatus = (typeof LEARNING_ITEM_STATUSES)[number];

export const PRACTICE_STAGES = ["reading", "outline", "answer", "reflection"] as const;
export type PracticeStage = (typeof PRACTICE_STAGES)[number];

export const KNOWLEDGE_CARD_LIFECYCLES = ["inbox", "refining", "usable", "core", "archived"] as const;
export type KnowledgeCardLifecycle = (typeof KNOWLEDGE_CARD_LIFECYCLES)[number];

export const VERIFICATION_STATUSES = ["unverified", "user-verified", "source-verified"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const REVIEW_CARD_MODES = [
  "key-point-recall",
  "expression-recall",
  "case-application",
  "placement-recall",
  "micro-writing",
] as const;
export type ReviewCardMode = (typeof REVIEW_CARD_MODES)[number];

export interface SourceDocument {
  readonly id: string;
  readonly title: string;
  readonly sourceType: SourceDocumentType;
  readonly contentMd: string;
  readonly sourceUri: string;
  readonly publisher: string;
  readonly publishedAt: string | null;
  readonly status: LearningItemStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SourceExcerpt {
  readonly id: string;
  readonly documentId: string;
  readonly contentMd: string;
  readonly locator: string;
  readonly noteMd: string;
  readonly createdAt: string;
}

export interface Exercise {
  readonly id: string;
  readonly title: string;
  readonly promptMd: string;
  readonly questionTypeSlug: string;
  readonly wordLimit: number | null;
  readonly timeLimitMinutes: number | null;
  readonly status: LearningItemStatus;
  readonly currentStage: PracticeStage;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Attempt {
  readonly id: string;
  readonly exerciseId: string;
  readonly outlineMd: string;
  readonly answerMd: string;
  readonly status: "in-progress" | "submitted" | "revised";
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly elapsedMs: number;
  readonly updatedAt: string;
}

export interface AttemptRevision {
  readonly id: string;
  readonly attemptId: string | null;
  readonly legacySourceMaterialId: string | null;
  readonly originalMd: string;
  readonly revisedMd: string;
  readonly promptTemplate: string;
  readonly revisionNumber: number;
  readonly createdAt: string;
}

export interface FeedbackDimensions {
  readonly keyPoints: number | null;
  readonly structure: number | null;
  readonly logic: number | null;
  readonly expression: number | null;
  readonly compliance: number | null;
}

export interface FeedbackRecord {
  readonly id: string;
  readonly attemptId: string;
  readonly source: "manual" | "rule" | "model";
  readonly dimensions: FeedbackDimensions;
  readonly summaryMd: string;
  readonly suggestionsMd: string;
  readonly createdAt: string;
}

export interface KnowledgeCard {
  readonly id: string;
  readonly title: string;
  readonly contentMd: string;
  readonly summary: string;
  readonly cardType: MaterialTypeId;
  readonly topicSlug: string;
  readonly lifecycle: KnowledgeCardLifecycle;
  readonly verificationStatus: VerificationStatus;
  readonly core: boolean;
  readonly reviewEnabled: boolean;
  readonly sourceLabel: string;
  readonly tagNames: readonly string[];
  readonly questionTypeSlugs: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CardSource {
  readonly cardId: string;
  readonly sourceDocumentId: string | null;
  readonly sourceExcerptId: string | null;
  readonly attemptId: string | null;
  readonly relationType: "evidence" | "extracted-from" | "revised-from" | "manual";
  readonly createdAt: string;
}

export interface CardUsage {
  readonly id: string;
  readonly cardId: string;
  readonly attemptId: string;
  readonly usageKind: "title" | "excerpt" | "content" | "argument" | "evidence";
  readonly slotKey: string;
  readonly usedAt: string;
}

export interface ReviewCard {
  readonly id: string;
  readonly knowledgeCardId: string;
  readonly mode: ReviewCardMode;
  readonly promptMd: string;
  readonly answerMd: string;
  readonly nextReviewAt: string | null;
  readonly lastReviewedAt: string | null;
  readonly ease: number;
  readonly intervalDays: number;
  readonly repetitions: number;
  readonly lapses: number;
}

export interface StudySession {
  readonly id: string;
  readonly plannedMinutes: number;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly status: "planned" | "active" | "completed" | "abandoned";
}

export interface StudyTask {
  readonly id: string;
  readonly kind: "review" | "practice" | "reflection" | "intake";
  readonly title: string;
  readonly description: string;
  readonly estimatedMinutes: number;
  readonly entityId: string | null;
  readonly priority: number;
  readonly status: "pending" | "active" | "completed" | "skipped" | "snoozed";
}

export interface StudySessionItem {
  readonly sessionId: string;
  readonly task: StudyTask;
  readonly order: number;
  readonly completedAt: string | null;
}

export interface WidgetPreferences {
  readonly enabled: boolean;
  readonly compact: boolean;
  readonly alwaysOnTop: boolean;
  readonly alwaysOnBottom: boolean;
  readonly privacyMode: boolean;
  readonly launchAtStartup: boolean;
  readonly x: number | null;
  readonly y: number | null;
  readonly width: number;
  readonly height: number;
}

export interface EntityChangedEvent {
  readonly entityType:
    | "source"
    | "exercise"
    | "attempt"
    | "feedback"
    | "knowledge-card"
    | "review-card"
    | "study-session"
    | "settings";
  readonly entityId: string;
  readonly revision: number;
}

export interface LearningWorkspaceState {
  readonly sources: readonly SourceDocument[];
  readonly excerpts: readonly SourceExcerpt[];
  readonly exercises: readonly Exercise[];
  readonly attempts: readonly Attempt[];
  readonly revisions: readonly AttemptRevision[];
  readonly feedback: readonly FeedbackRecord[];
  readonly cards: readonly KnowledgeCard[];
  readonly cardSources: readonly CardSource[];
  readonly cardUsages: readonly CardUsage[];
  readonly reviewCards: readonly ReviewCard[];
  readonly sessions: readonly StudySession[];
  readonly sessionItems: readonly StudySessionItem[];
}

export const EMPTY_LEARNING_WORKSPACE: LearningWorkspaceState = {
  sources: [],
  excerpts: [],
  exercises: [],
  attempts: [],
  revisions: [],
  feedback: [],
  cards: [],
  cardSources: [],
  cardUsages: [],
  reviewCards: [],
  sessions: [],
  sessionItems: [],
};

export interface ReviewCardResult {
  readonly reviewCardId: string;
  readonly rating: ReviewRating;
  readonly reviewedAt: string;
}
