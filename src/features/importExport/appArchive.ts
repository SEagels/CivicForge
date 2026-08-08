import { MATERIAL_TYPE_IDS, MATERIAL_STATUSES } from "../../domain/enums";
import { normalizeMaterialState, type MaterialDraft, type MaterialState } from "../materials/materialModel";
import { isReviewLog } from "../review/reviewPersistence";
import type { ReviewLog } from "../review/reviewSession";
import type { RewriteLog } from "../rewrite/rewriteWorkshop";
import { REWRITE_TARGET_IDS } from "../rewrite/rewriteWorkshop";
import { THEME_MODES, type AppSettings } from "../settings/appSettings";
import type { LearningWorkspaceState } from "../../domain/learning";
import { createLearningWorkspaceFromMaterials } from "../learning/learningModel";
import { normalizeLearningWorkspace } from "../learning/learningPersistence";

export const CIVICFORGE_ARCHIVE_VERSION = 3;

export interface CivicForgeArchiveInput {
  readonly materialsState: MaterialState;
  readonly reviewLogs: readonly ReviewLog[];
  readonly rewriteLogs: readonly RewriteLog[];
  readonly settings: AppSettings;
  readonly learningWorkspace?: LearningWorkspaceState;
}

export interface CivicForgeArchive {
  readonly appName: "CivicForge";
  readonly version: typeof CIVICFORGE_ARCHIVE_VERSION;
  readonly exportedAt: string;
  readonly materialsState: MaterialState;
  readonly reviewLogs: readonly ReviewLog[];
  readonly rewriteLogs: readonly RewriteLog[];
  readonly settings: AppSettings;
  readonly learningWorkspace: LearningWorkspaceState;
}

export function createAppArchive(input: CivicForgeArchiveInput, exportedAt: Date = new Date()): CivicForgeArchive {
  return {
    appName: "CivicForge",
    version: CIVICFORGE_ARCHIVE_VERSION,
    exportedAt: exportedAt.toISOString(),
    materialsState: input.materialsState,
    reviewLogs: input.reviewLogs,
    rewriteLogs: input.rewriteLogs,
    settings: input.settings,
    learningWorkspace:
      input.learningWorkspace ?? createLearningWorkspaceFromMaterials(input.materialsState.materials),
  };
}

export function serializeAppArchive(archive: CivicForgeArchive): string {
  return JSON.stringify(archive, null, 2);
}

export function parseAppArchive(raw: string): CivicForgeArchive | null {
  try {
    const payload = JSON.parse(raw) as Partial<Omit<CivicForgeArchive, "version" | "reviewLogs">> & {
      readonly version?: unknown;
      readonly reviewLogs?: unknown;
      readonly learningWorkspace?: unknown;
    };

    if (payload.appName !== "CivicForge" || !isSupportedArchiveVersion(payload.version)) {
      return null;
    }

    if (
      typeof payload.exportedAt !== "string" ||
      !isMaterialState(payload.materialsState) ||
      !Array.isArray(payload.rewriteLogs) ||
      !payload.rewriteLogs.every(isRewriteLog) ||
      !isAppSettings(payload.settings)
    ) {
      return null;
    }

    const reviewLogs = payload.version === 1 ? [] : payload.reviewLogs;

    if (!Array.isArray(reviewLogs) || !reviewLogs.every(isReviewLog)) {
      return null;
    }

    const materialsState = normalizeMaterialState(payload.materialsState);
    const learningWorkspace =
      payload.version === 3 && isLearningWorkspace(payload.learningWorkspace)
        ? normalizeLearningWorkspace(payload.learningWorkspace)
        : createLearningWorkspaceFromMaterials(materialsState.materials);

    return {
      appName: "CivicForge",
      version: CIVICFORGE_ARCHIVE_VERSION,
      exportedAt: payload.exportedAt,
      materialsState,
      reviewLogs,
      rewriteLogs: payload.rewriteLogs,
      settings: payload.settings,
      learningWorkspace,
    };
  } catch {
    return null;
  }
}

function isSupportedArchiveVersion(value: unknown): value is 1 | 2 | typeof CIVICFORGE_ARCHIVE_VERSION {
  return value === 1 || value === 2 || value === CIVICFORGE_ARCHIVE_VERSION;
}

function isLearningWorkspace(value: unknown): value is LearningWorkspaceState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LearningWorkspaceState>;
  return [
    candidate.sources,
    candidate.excerpts,
    candidate.exercises,
    candidate.attempts,
    candidate.revisions,
    candidate.feedback,
    candidate.cards,
    candidate.cardSources,
    candidate.cardUsages,
    candidate.reviewCards,
    candidate.sessions,
    candidate.sessionItems,
  ].every(Array.isArray);
}

export function createArchiveFilename(now: Date = new Date()): string {
  return `civicforge-backup-${now.toISOString().slice(0, 10)}.json`;
}

function isMaterialState(value: unknown): value is MaterialState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as MaterialState;

  return (
    Array.isArray(candidate.materials) &&
    candidate.materials.length > 0 &&
    candidate.materials.every(isMaterialDraft) &&
    (typeof candidate.selectedId === "string" || candidate.selectedId === null)
  );
}

function isMaterialDraft(value: unknown): value is MaterialDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as MaterialDraft;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.contentMd === "string" &&
    typeof candidate.excerpt === "string" &&
    MATERIAL_TYPE_IDS.includes(candidate.materialType) &&
    typeof candidate.topicSlug === "string" &&
    Array.isArray(candidate.tagNames) &&
    candidate.tagNames.every((tagName) => typeof tagName === "string") &&
    Array.isArray(candidate.questionTypeSlugs) &&
    candidate.questionTypeSlugs.every((slug) => typeof slug === "string") &&
    typeof candidate.source === "string" &&
    MATERIAL_STATUSES.includes(candidate.status) &&
    typeof candidate.favorite === "boolean" &&
    typeof candidate.reviewEnabled === "boolean" &&
    typeof candidate.updatedAt === "string"
  );
}

function isRewriteLog(value: unknown): value is RewriteLog {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as RewriteLog;

  return (
    typeof candidate.id === "string" &&
    (typeof candidate.sourceMaterialId === "string" || candidate.sourceMaterialId === null) &&
    REWRITE_TARGET_IDS.includes(candidate.targetId) &&
    typeof candidate.originalText === "string" &&
    typeof candidate.promptTemplate === "string" &&
    typeof candidate.resultText === "string" &&
    (candidate.status === "saved" || candidate.status === "discarded") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as AppSettings;

  return THEME_MODES.includes(candidate.themeMode) && typeof candidate.backupReminderEnabled === "boolean";
}
