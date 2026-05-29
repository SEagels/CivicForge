import { describe, expect, it, vi } from "vitest";
import { createInitialMaterialState, type MaterialState } from "../materials/materialModel";
import { CIVICFORGE_MATERIAL_STORAGE_KEY, saveMaterialState } from "../materials/materialPersistence";
import type { MaterialRepository } from "../materials/materialRepository";
import { CIVICFORGE_REVIEW_STORAGE_KEY, saveReviewLogs } from "../review/reviewPersistence";
import type { ReviewLogRepository } from "../review/reviewLogRepository";
import type { ReviewLog } from "../review/reviewSession";
import { CIVICFORGE_REWRITE_STORAGE_KEY, saveRewriteLogs } from "../rewrite/rewritePersistence";
import type { RewriteLogRepository } from "../rewrite/rewriteLogRepository";
import type { RewriteLog } from "../rewrite/rewriteWorkshop";
import { CIVICFORGE_SETTINGS_STORAGE_KEY, saveAppSettings } from "../settings/appSettings";
import type { SettingsRepository } from "../settings/settingsRepository";
import { createAppDataService } from "./appDataService";

describe("app data service", () => {
  it("loads and saves through localStorage when SQLite is unavailable", async () => {
    const materialStorage = createMemoryStorage();
    const reviewStorage = createMemoryStorage();
    const rewriteStorage = createMemoryStorage();
    const settingsStorage = createMemoryStorage();
    const materialsState = createInitialMaterialState();
    const reviewLogs = [createReviewLog()];
    const rewriteLogs = [createRewriteLog()];

    saveMaterialState(materialStorage, materialsState);
    saveReviewLogs(reviewStorage, reviewLogs);
    saveRewriteLogs(rewriteStorage, rewriteLogs);
    saveAppSettings(settingsStorage, {
      themeMode: "dark",
      backupReminderEnabled: false,
    });

    const service = createAppDataService({
      materialStorage,
      reviewStorage,
      rewriteStorage,
      settingsStorage,
      loadDatabase: async () => null,
    });
    const snapshot = await service.load();

    expect(snapshot.storageMode).toBe("Preview localStorage");
    expect(snapshot.materialsState.selectedId).toBe(materialsState.selectedId);
    expect(snapshot.reviewLogs).toEqual(reviewLogs);
    expect(snapshot.rewriteLogs).toEqual(rewriteLogs);
    expect(snapshot.settings).toEqual({ themeMode: "dark", backupReminderEnabled: false });

    await service.saveMaterials(materialsState);
    await service.saveReviewLogs([]);
    await service.saveRewriteLogs([]);
    await service.saveSettings({ themeMode: "light", backupReminderEnabled: true });

    expect(materialStorage.getItem(CIVICFORGE_MATERIAL_STORAGE_KEY)).toContain(materialsState.materials[0].id);
    expect(reviewStorage.getItem(CIVICFORGE_REVIEW_STORAGE_KEY)).toContain("\"logs\":[]");
    expect(rewriteStorage.getItem(CIVICFORGE_REWRITE_STORAGE_KEY)).toContain("\"logs\":[]");
    expect(settingsStorage.getItem(CIVICFORGE_SETTINGS_STORAGE_KEY)).toContain("\"themeMode\":\"light\"");
  });

  it("initializes SQLite, seeds starter materials when empty, and saves through repositories", async () => {
    const initialMaterials = createInitialMaterialState();
    const materialRepository = createFakeMaterialRepository([]);
    const reviewRepository = createFakeReviewRepository([createReviewLog()]);
    const rewriteRepository = createFakeRewriteRepository([createRewriteLog()]);
    const settingsRepository = createFakeSettingsRepository();
    const initializeDatabase = vi.fn(async () => undefined);

    const service = createAppDataService({
      initialMaterialState: initialMaterials,
      materialStorage: null,
      reviewStorage: null,
      rewriteStorage: null,
      settingsStorage: null,
      loadDatabase: async () => createFakeDb(),
      initializeDatabase,
      createMaterialRepository: () => materialRepository,
      createReviewLogRepository: () => reviewRepository,
      createRewriteLogRepository: () => rewriteRepository,
      createSettingsRepository: () => settingsRepository,
    });

    const snapshot = await service.load();

    expect(initializeDatabase).toHaveBeenCalledOnce();
    expect(snapshot.storageMode).toBe("SQLite");
    expect(snapshot.materialsState.materials).toHaveLength(3);
    expect(materialRepository.savedIds).toEqual(initialMaterials.materials.map((material) => material.id));
    expect(snapshot.reviewLogs).toHaveLength(1);
    expect(snapshot.rewriteLogs).toHaveLength(1);
    expect(snapshot.settings).toEqual({ themeMode: "dark", backupReminderEnabled: false });

    const archivedState: MaterialState = {
      materials: [{ ...initialMaterials.materials[0], status: "archived" }],
      selectedId: null,
    };
    await service.saveMaterials(archivedState);
    await service.saveReviewLogs([]);
    await service.saveRewriteLogs([]);
    await service.saveSettings({ themeMode: "light", backupReminderEnabled: true });

    expect(materialRepository.archivedIds).toEqual([initialMaterials.materials[0].id]);
    expect(reviewRepository.replacedLogs).toEqual([]);
    expect(rewriteRepository.replacedLogs).toEqual([]);
    expect(settingsRepository.savedSettings).toEqual({ themeMode: "light", backupReminderEnabled: true });
  });
});

function createRewriteLog(): RewriteLog {
  return {
    id: "rewrite-1",
    sourceMaterialId: null,
    targetId: "compress",
    originalText: "raw",
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

function createFakeDb() {
  return {
    execute: async () => ({ rowsAffected: 1 }),
    select: async <T,>() => [] as T,
    close: async () => true,
  };
}

function createFakeMaterialRepository(listResult: MaterialRepository extends infer _ ? readonly MaterialState["materials"][number][] : never) {
  const savedIds: string[] = [];
  const archivedIds: string[] = [];
  const repository: MaterialRepository & { savedIds: string[]; archivedIds: string[] } = {
    savedIds,
    archivedIds,
    listActiveMaterials: async () => listResult,
    searchMaterials: async () => listResult,
    saveMaterial: async (material) => {
      savedIds.push(material.id);
    },
    archiveMaterial: async (materialId) => {
      archivedIds.push(materialId);
    },
  };

  return repository;
}

function createFakeRewriteRepository(logs: readonly RewriteLog[]) {
  let replacedLogs: readonly RewriteLog[] | null = null;
  const repository: RewriteLogRepository & { readonly replacedLogs: readonly RewriteLog[] | null } = {
    get replacedLogs() {
      return replacedLogs;
    },
    listRewriteLogs: async () => logs,
    saveRewriteLog: async () => undefined,
    deleteRewriteLog: async () => undefined,
    replaceRewriteLogs: async (nextLogs) => {
      replacedLogs = nextLogs;
    },
  };

  return repository;
}

function createFakeReviewRepository(logs: readonly ReviewLog[]) {
  let replacedLogs: readonly ReviewLog[] | null = null;
  const repository: ReviewLogRepository & { readonly replacedLogs: readonly ReviewLog[] | null } = {
    get replacedLogs() {
      return replacedLogs;
    },
    listReviewLogs: async () => logs,
    saveReviewLog: async () => undefined,
    replaceReviewLogs: async (nextLogs) => {
      replacedLogs = nextLogs;
    },
    clearReviewLogs: async () => undefined,
  };

  return repository;
}

function createFakeSettingsRepository() {
  const repository: SettingsRepository & { savedSettings: unknown } = {
    savedSettings: null,
    loadSettings: async () => ({ themeMode: "dark", backupReminderEnabled: false }),
    saveSettings: async (settings) => {
      repository.savedSettings = settings;
    },
    clearSettings: async () => undefined,
  };

  return repository;
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
