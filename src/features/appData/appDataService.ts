import { loadCivicForgeDatabase, type CivicForgeDatabase } from "../../lib/db/databaseClient";
import { initializeCivicForgeDatabase } from "../../lib/db/databaseInitializer";
import {
  createInitialMaterialState,
  normalizeMaterialState,
  type MaterialDraft,
  type MaterialState,
} from "../materials/materialModel";
import { getBrowserMaterialStorage, loadMaterialState, saveMaterialState } from "../materials/materialPersistence";
import { createMaterialRepository, type MaterialRepository } from "../materials/materialRepository";
import { getBrowserReviewStorage, loadReviewLogs, saveReviewLogs } from "../review/reviewPersistence";
import { createReviewLogRepository, type ReviewLogRepository } from "../review/reviewLogRepository";
import type { ReviewLog } from "../review/reviewSession";
import { getBrowserRewriteStorage, loadRewriteLogs, saveRewriteLogs } from "../rewrite/rewritePersistence";
import { createRewriteLogRepository, type RewriteLogRepository } from "../rewrite/rewriteLogRepository";
import type { RewriteLog } from "../rewrite/rewriteWorkshop";
import {
  DEFAULT_APP_SETTINGS,
  getBrowserSettingsStorage,
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
} from "../settings/appSettings";
import { createSettingsRepository, type SettingsRepository } from "../settings/settingsRepository";

export type StorageMode = "SQLite" | "Preview localStorage";

export interface AppDataSnapshot {
  readonly materialsState: MaterialState;
  readonly reviewLogs: readonly ReviewLog[];
  readonly rewriteLogs: readonly RewriteLog[];
  readonly settings: AppSettings;
  readonly storageMode: StorageMode;
}

export type AppDataRestoreSnapshot = Omit<AppDataSnapshot, "storageMode">;

export interface AppDataService {
  load(): Promise<AppDataSnapshot>;
  saveMaterials(state: MaterialState): Promise<void>;
  saveReviewLogs(logs: readonly ReviewLog[]): Promise<void>;
  saveRewriteLogs(logs: readonly RewriteLog[]): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  restore(snapshot: AppDataRestoreSnapshot): Promise<void>;
}

interface AppDataServiceOptions {
  readonly initialMaterialState?: MaterialState;
  readonly materialStorage?: Storage | null;
  readonly reviewStorage?: Storage | null;
  readonly rewriteStorage?: Storage | null;
  readonly settingsStorage?: Storage | null;
  readonly loadDatabase?: () => Promise<CivicForgeDatabase | null>;
  readonly initializeDatabase?: (db: CivicForgeDatabase) => Promise<void>;
  readonly createMaterialRepository?: (db: CivicForgeDatabase) => MaterialRepository;
  readonly createReviewLogRepository?: (db: CivicForgeDatabase) => ReviewLogRepository;
  readonly createRewriteLogRepository?: (db: CivicForgeDatabase) => RewriteLogRepository;
  readonly createSettingsRepository?: (db: CivicForgeDatabase) => SettingsRepository;
}

export function createAppDataService(options: AppDataServiceOptions = {}): AppDataService {
  const initialMaterialState = options.initialMaterialState ?? createInitialMaterialState();
  const materialStorage = options.materialStorage === undefined ? getBrowserMaterialStorage() : options.materialStorage;
  const reviewStorage = options.reviewStorage === undefined ? getBrowserReviewStorage() : options.reviewStorage;
  const rewriteStorage = options.rewriteStorage === undefined ? getBrowserRewriteStorage() : options.rewriteStorage;
  const settingsStorage = options.settingsStorage === undefined ? getBrowserSettingsStorage() : options.settingsStorage;
  const loadDatabase = options.loadDatabase ?? loadCivicForgeDatabase;
  const initializeDatabase = options.initializeDatabase ?? initializeCivicForgeDatabase;
  const materialRepositoryFactory = options.createMaterialRepository ?? createMaterialRepository;
  const reviewLogRepositoryFactory = options.createReviewLogRepository ?? createReviewLogRepository;
  const rewriteLogRepositoryFactory = options.createRewriteLogRepository ?? createRewriteLogRepository;
  const settingsRepositoryFactory = options.createSettingsRepository ?? createSettingsRepository;

  let storageMode: StorageMode = "Preview localStorage";
  let materialRepository: MaterialRepository | null = null;
  let reviewLogRepository: ReviewLogRepository | null = null;
  let rewriteLogRepository: RewriteLogRepository | null = null;
  let settingsRepository: SettingsRepository | null = null;

  async function load(): Promise<AppDataSnapshot> {
    const fallbackMaterialsState = materialStorage
      ? loadMaterialState(materialStorage) ?? initialMaterialState
      : initialMaterialState;
    const fallbackReviewLogs = reviewStorage ? loadReviewLogs(reviewStorage) : [];
    const fallbackRewriteLogs = rewriteStorage ? loadRewriteLogs(rewriteStorage) : [];
    const fallbackSettings = settingsStorage ? loadAppSettings(settingsStorage) : DEFAULT_APP_SETTINGS;

    try {
      const db = await loadDatabase();

      if (!db) {
        storageMode = "Preview localStorage";
        return {
          materialsState: fallbackMaterialsState,
          reviewLogs: fallbackReviewLogs,
          rewriteLogs: fallbackRewriteLogs,
          settings: fallbackSettings,
          storageMode,
        };
      }

      await initializeDatabase(db);
      materialRepository = materialRepositoryFactory(db);
      reviewLogRepository = reviewLogRepositoryFactory(db);
      rewriteLogRepository = rewriteLogRepositoryFactory(db);
      settingsRepository = settingsRepositoryFactory(db);
      storageMode = "SQLite";

      const sqliteMaterials = await materialRepository.listActiveMaterials();
      const materialsState =
        sqliteMaterials.length > 0 ? createMaterialStateFromRows(sqliteMaterials, fallbackMaterialsState) : fallbackMaterialsState;

      if (sqliteMaterials.length === 0) {
        await saveMaterialsToRepository(materialRepository, fallbackMaterialsState);
      }

      const sqliteReviewLogs = await reviewLogRepository.listReviewLogs();
      const reviewLogs = sqliteReviewLogs.length > 0 ? sqliteReviewLogs : fallbackReviewLogs;

      if (sqliteReviewLogs.length === 0 && fallbackReviewLogs.length > 0) {
        await reviewLogRepository.replaceReviewLogs(fallbackReviewLogs);
      }

      const sqliteRewriteLogs = await rewriteLogRepository.listRewriteLogs();
      const rewriteLogs = sqliteRewriteLogs.length > 0 ? sqliteRewriteLogs : fallbackRewriteLogs;

      if (sqliteRewriteLogs.length === 0 && fallbackRewriteLogs.length > 0) {
        await rewriteLogRepository.replaceRewriteLogs(fallbackRewriteLogs);
      }

      const settings = await settingsRepository.loadSettings();

      return {
        materialsState,
        reviewLogs,
        rewriteLogs,
        settings,
        storageMode,
      };
    } catch (error) {
      console.warn("Unable to initialize CivicForge SQLite storage; falling back to preview persistence.", error);
      materialRepository = null;
      reviewLogRepository = null;
      rewriteLogRepository = null;
      settingsRepository = null;
      storageMode = "Preview localStorage";

      return {
        materialsState: fallbackMaterialsState,
        reviewLogs: fallbackReviewLogs,
        rewriteLogs: fallbackRewriteLogs,
        settings: fallbackSettings,
        storageMode,
      };
    }
  }

  async function saveMaterials(state: MaterialState): Promise<void> {
    if (materialStorage) {
      saveMaterialState(materialStorage, state);
    }

    if (materialRepository) {
      await saveMaterialsToRepository(materialRepository, state);
    }
  }

  async function saveRewriteLogs(logs: readonly RewriteLog[]): Promise<void> {
    if (rewriteStorage) {
      saveRewriteLogsToStorage(rewriteStorage, logs);
    }

    if (rewriteLogRepository) {
      await rewriteLogRepository.replaceRewriteLogs(logs);
    }
  }

  async function saveReviewLogsToService(logs: readonly ReviewLog[]): Promise<void> {
    if (reviewStorage) {
      saveReviewLogs(reviewStorage, logs);
    }

    if (reviewLogRepository) {
      await reviewLogRepository.replaceReviewLogs(logs);
    }
  }

  async function saveSettingsToService(settings: AppSettings): Promise<void> {
    if (settingsStorage) {
      saveAppSettings(settingsStorage, settings);
    }

    if (settingsRepository) {
      await settingsRepository.saveSettings(settings);
    }
  }

  async function restore(snapshot: AppDataRestoreSnapshot): Promise<void> {
    await saveMaterials(snapshot.materialsState);
    await saveReviewLogsToService(snapshot.reviewLogs);
    await saveRewriteLogs(snapshot.rewriteLogs);
    await saveSettingsToService(snapshot.settings);
  }

  return {
    load,
    saveMaterials,
    saveReviewLogs: saveReviewLogsToService,
    saveRewriteLogs,
    saveSettings: saveSettingsToService,
    restore,
  };
}

function createMaterialStateFromRows(
  materials: readonly MaterialDraft[],
  fallbackState: MaterialState,
): MaterialState {
  const selectedId = materials.some((material) => material.id === fallbackState.selectedId)
    ? fallbackState.selectedId
    : materials[0]?.id ?? null;

  return normalizeMaterialState({
    materials,
    selectedId,
  });
}

async function saveMaterialsToRepository(repository: MaterialRepository, state: MaterialState): Promise<void> {
  for (const material of state.materials) {
    if (material.status === "archived") {
      await repository.archiveMaterial(material.id);
      continue;
    }

    if (material.status === "active" || material.status === "draft") {
      await repository.saveMaterial(material);
    }
  }
}

function saveRewriteLogsToStorage(storage: Storage, logs: readonly RewriteLog[]): void {
  saveRewriteLogs(storage, logs);
}
