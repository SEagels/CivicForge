import { MATERIAL_TYPE_IDS, MATERIAL_STATUSES } from "../../domain/enums";
import { normalizeMaterialState, type MaterialDraft, type MaterialState } from "../materials/materialModel";
import type { RewriteLog } from "../rewrite/rewriteWorkshop";
import { REWRITE_TARGET_IDS } from "../rewrite/rewriteWorkshop";
import { THEME_MODES, type AppSettings } from "../settings/appSettings";

export const CIVICFORGE_ARCHIVE_VERSION = 1;

export interface CivicForgeArchiveInput {
  readonly materialsState: MaterialState;
  readonly rewriteLogs: readonly RewriteLog[];
  readonly settings: AppSettings;
}

export interface CivicForgeArchive extends CivicForgeArchiveInput {
  readonly appName: "CivicForge";
  readonly version: typeof CIVICFORGE_ARCHIVE_VERSION;
  readonly exportedAt: string;
}

export function createAppArchive(input: CivicForgeArchiveInput, exportedAt: Date = new Date()): CivicForgeArchive {
  return {
    appName: "CivicForge",
    version: CIVICFORGE_ARCHIVE_VERSION,
    exportedAt: exportedAt.toISOString(),
    materialsState: input.materialsState,
    rewriteLogs: input.rewriteLogs,
    settings: input.settings,
  };
}

export function serializeAppArchive(archive: CivicForgeArchive): string {
  return JSON.stringify(archive, null, 2);
}

export function parseAppArchive(raw: string): CivicForgeArchive | null {
  try {
    const payload = JSON.parse(raw) as Partial<CivicForgeArchive>;

    if (
      payload.appName !== "CivicForge" ||
      payload.version !== CIVICFORGE_ARCHIVE_VERSION ||
      typeof payload.exportedAt !== "string" ||
      !isMaterialState(payload.materialsState) ||
      !Array.isArray(payload.rewriteLogs) ||
      !payload.rewriteLogs.every(isRewriteLog) ||
      !isAppSettings(payload.settings)
    ) {
      return null;
    }

    return {
      appName: "CivicForge",
      version: CIVICFORGE_ARCHIVE_VERSION,
      exportedAt: payload.exportedAt,
      materialsState: normalizeMaterialState(payload.materialsState),
      rewriteLogs: payload.rewriteLogs,
      settings: payload.settings,
    };
  } catch {
    return null;
  }
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
