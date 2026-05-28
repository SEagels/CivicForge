import { describe, expect, it } from "vitest";
import { createInitialMaterialState } from "../materials/materialModel";
import type { ReviewLog } from "../review/reviewSession";
import type { RewriteLog } from "../rewrite/rewriteWorkshop";
import { DEFAULT_APP_SETTINGS } from "../settings/appSettings";
import {
  CIVICFORGE_ARCHIVE_VERSION,
  createAppArchive,
  createArchiveFilename,
  parseAppArchive,
  serializeAppArchive,
} from "./appArchive";

describe("app archive", () => {
  it("creates a versioned archive containing materials, review logs, rewrite logs, and settings", () => {
    const materialsState = createInitialMaterialState();
    const reviewLogs: readonly ReviewLog[] = [createReviewLog()];
    const rewriteLogs: readonly RewriteLog[] = [createRewriteLog()];
    const exportedAt = new Date("2026-05-23T10:20:30.000Z");

    const archive = createAppArchive(
      {
        materialsState,
        reviewLogs,
        rewriteLogs,
        settings: {
          themeMode: "dark",
          backupReminderEnabled: false,
        },
      },
      exportedAt,
    );

    expect(archive).toEqual({
      appName: "CivicForge",
      version: CIVICFORGE_ARCHIVE_VERSION,
      exportedAt: "2026-05-23T10:20:30.000Z",
      materialsState,
      reviewLogs,
      rewriteLogs,
      settings: {
        themeMode: "dark",
        backupReminderEnabled: false,
      },
    });
  });

  it("serializes and parses a valid archive", () => {
    const archive = createAppArchive({
      materialsState: createInitialMaterialState(),
      reviewLogs: [createReviewLog()],
      rewriteLogs: [createRewriteLog()],
      settings: DEFAULT_APP_SETTINGS,
    });

    const parsed = parseAppArchive(serializeAppArchive(archive));

    expect(parsed?.appName).toBe("CivicForge");
    expect(parsed?.materialsState.materials).toHaveLength(3);
    expect(parsed?.reviewLogs).toHaveLength(1);
    expect(parsed?.rewriteLogs).toHaveLength(1);
    expect(parsed?.settings).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("parses legacy v1 archives without review logs", () => {
    const legacyArchive = {
      appName: "CivicForge",
      version: 1,
      exportedAt: "2026-05-23T10:20:30.000Z",
      materialsState: createInitialMaterialState(),
      rewriteLogs: [createRewriteLog()],
      settings: DEFAULT_APP_SETTINGS,
    };

    const parsed = parseAppArchive(JSON.stringify(legacyArchive));

    expect(parsed?.version).toBe(CIVICFORGE_ARCHIVE_VERSION);
    expect(parsed?.reviewLogs).toEqual([]);
    expect(parsed?.rewriteLogs).toHaveLength(1);
  });

  it("rejects malformed, incompatible, or incomplete archives", () => {
    expect(parseAppArchive("{bad json")).toBeNull();
    expect(parseAppArchive(JSON.stringify({ appName: "CivicForge", version: 999 }))).toBeNull();
    expect(parseAppArchive(JSON.stringify({ appName: "OtherApp", version: 1 }))).toBeNull();
    expect(parseAppArchive(JSON.stringify({ appName: "CivicForge", version: 1, materialsState: {} }))).toBeNull();
  });

  it("creates a stable local backup filename", () => {
    expect(createArchiveFilename(new Date("2026-05-23T10:20:30.000Z"))).toBe("civicforge-backup-2026-05-23.json");
  });
});

function createRewriteLog(): RewriteLog {
  return {
    id: "rewrite-1",
    sourceMaterialId: null,
    targetId: "compress",
    originalText: "raw material",
    promptTemplate: "prompt",
    resultText: "result",
    status: "saved",
    createdAt: "2026-05-23T10:00:00.000Z",
    updatedAt: "2026-05-23T10:00:00.000Z",
  };
}

function createReviewLog(): ReviewLog {
  return {
    id: "review-1",
    materialId: "mat-grid-governance",
    reviewedAt: "2026-05-23T10:00:00.000Z",
    rating: "good",
    reviewMode: "active-recall",
    topicSlug: "grassroots-governance",
    questionTypeSlugs: ["countermeasure"],
    materialType: "standard-expression",
    previousDueAt: null,
    nextDueAt: "2026-05-24T10:00:00.000Z",
    previousIntervalDays: 0,
    nextIntervalDays: 1,
    previousEase: 2.5,
    nextEase: 2.5,
    elapsedMs: 60_000,
    answerRevealedAt: "2026-05-23T09:59:30.000Z",
    note: "",
  };
}
