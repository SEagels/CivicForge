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
import type { LearningWorkspaceState, SourceDocument } from "../../domain/learning";
import {
  getBrowserLearningStorage,
  loadLearningWorkspace,
  saveLearningWorkspace,
} from "../learning/learningPersistence";
import { createLearningWorkspaceFromMaterials } from "../learning/learningModel";
import { createLearningRepository, type LearningRepository } from "../learning/learningRepository";

export type StorageMode = "SQLite" | "Preview localStorage";

export interface AppDataSnapshot {
  readonly materialsState: MaterialState;
  readonly reviewLogs: readonly ReviewLog[];
  readonly rewriteLogs: readonly RewriteLog[];
  readonly settings: AppSettings;
  readonly learningWorkspace: LearningWorkspaceState;
  readonly storageMode: StorageMode;
  readonly storageError: string | null;
}

export type AppDataRestoreSnapshot = Omit<AppDataSnapshot, "storageMode" | "storageError">;

export interface AppDataService {
  load(): Promise<AppDataSnapshot>;
  saveMaterials(state: MaterialState): Promise<void>;
  saveReviewLogs(logs: readonly ReviewLog[]): Promise<void>;
  saveRewriteLogs(logs: readonly RewriteLog[]): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  saveLearningWorkspace(state: LearningWorkspaceState): Promise<void>;
  saveSource(source: SourceDocument): Promise<void>;
  restore(snapshot: AppDataRestoreSnapshot): Promise<void>;
}

interface AppDataServiceOptions {
  readonly initialMaterialState?: MaterialState;
  readonly materialStorage?: Storage | null;
  readonly reviewStorage?: Storage | null;
  readonly rewriteStorage?: Storage | null;
  readonly settingsStorage?: Storage | null;
  readonly learningStorage?: Storage | null;
  readonly loadDatabase?: () => Promise<CivicForgeDatabase | null>;
  readonly initializeDatabase?: (db: CivicForgeDatabase) => Promise<void>;
  readonly createMaterialRepository?: (db: CivicForgeDatabase) => MaterialRepository;
  readonly createReviewLogRepository?: (db: CivicForgeDatabase) => ReviewLogRepository;
  readonly createRewriteLogRepository?: (db: CivicForgeDatabase) => RewriteLogRepository;
  readonly createSettingsRepository?: (db: CivicForgeDatabase) => SettingsRepository;
  readonly createLearningRepository?: (db: CivicForgeDatabase) => LearningRepository;
}

export function createAppDataService(options: AppDataServiceOptions = {}): AppDataService {
  const initialMaterialState = options.initialMaterialState ?? createInitialMaterialState();
  const materialStorage = options.materialStorage === undefined ? getBrowserMaterialStorage() : options.materialStorage;
  const reviewStorage = options.reviewStorage === undefined ? getBrowserReviewStorage() : options.reviewStorage;
  const rewriteStorage = options.rewriteStorage === undefined ? getBrowserRewriteStorage() : options.rewriteStorage;
  const settingsStorage = options.settingsStorage === undefined ? getBrowserSettingsStorage() : options.settingsStorage;
  const learningStorage = options.learningStorage === undefined ? getBrowserLearningStorage() : options.learningStorage;
  const loadDatabase = options.loadDatabase ?? loadCivicForgeDatabase;
  const initializeDatabase = options.initializeDatabase ?? initializeCivicForgeDatabase;
  const materialRepositoryFactory = options.createMaterialRepository ?? createMaterialRepository;
  const reviewLogRepositoryFactory = options.createReviewLogRepository ?? createReviewLogRepository;
  const rewriteLogRepositoryFactory = options.createRewriteLogRepository ?? createRewriteLogRepository;
  const settingsRepositoryFactory = options.createSettingsRepository ?? createSettingsRepository;
  const learningRepositoryFactory = options.createLearningRepository ?? createLearningRepository;

  let storageMode: StorageMode = "Preview localStorage";
  let materialRepository: MaterialRepository | null = null;
  let reviewLogRepository: ReviewLogRepository | null = null;
  let rewriteLogRepository: RewriteLogRepository | null = null;
  let settingsRepository: SettingsRepository | null = null;
  let learningRepository: LearningRepository | null = null;
  let writeQueue: Promise<void> = Promise.resolve();

  function enqueueWrite(operation: () => Promise<void>): Promise<void> {
    const run = writeQueue.then(operation, operation);
    writeQueue = run.catch(() => undefined);
    return run;
  }

  async function loadAfterPendingWrites(): Promise<AppDataSnapshot> {
    await writeQueue;
    return load();
  }

  async function load(): Promise<AppDataSnapshot> {
    const fallbackMaterialsState = materialStorage
      ? loadMaterialState(materialStorage) ?? initialMaterialState
      : initialMaterialState;
    const fallbackReviewLogs = reviewStorage ? loadReviewLogs(reviewStorage) : [];
    const fallbackRewriteLogs = rewriteStorage ? loadRewriteLogs(rewriteStorage) : [];
    const fallbackSettings = settingsStorage ? loadAppSettings(settingsStorage) : DEFAULT_APP_SETTINGS;
    const fallbackLearning = createLearningWorkspaceFromMaterials(
      fallbackMaterialsState.materials,
      learningStorage ? loadLearningWorkspace(learningStorage) : undefined,
    );

    try {
      const db = await loadDatabase();

      if (!db) {
        storageMode = "Preview localStorage";
        return {
          materialsState: fallbackMaterialsState,
          reviewLogs: fallbackReviewLogs,
          rewriteLogs: fallbackRewriteLogs,
          settings: fallbackSettings,
          learningWorkspace: fallbackLearning,
          storageMode,
          storageError: null,
        };
      }

      await initializeDatabase(db);
      materialRepository = materialRepositoryFactory(db);
      reviewLogRepository = reviewLogRepositoryFactory(db);
      rewriteLogRepository = rewriteLogRepositoryFactory(db);
      settingsRepository = settingsRepositoryFactory(db);
      learningRepository = learningRepositoryFactory(db);
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
      const sqliteLearning = await learningRepository.loadWorkspace();
      const learningWorkspace = createLearningWorkspaceFromMaterials(materialsState.materials, sqliteLearning);

      if (sqliteLearning.cards.length === 0 && learningWorkspace.cards.length > 0) {
        await learningRepository.replaceWorkspace(learningWorkspace);
      }

      return {
        materialsState,
        reviewLogs,
        rewriteLogs,
        settings,
        learningWorkspace,
        storageMode,
        storageError: null,
      };
    } catch (error) {
      console.warn("Unable to initialize CivicForge SQLite storage; falling back to preview persistence.", error);
      materialRepository = null;
      reviewLogRepository = null;
      rewriteLogRepository = null;
      settingsRepository = null;
      learningRepository = null;
      storageMode = "Preview localStorage";

      return {
        materialsState: fallbackMaterialsState,
        reviewLogs: fallbackReviewLogs,
        rewriteLogs: fallbackRewriteLogs,
        settings: fallbackSettings,
        learningWorkspace: fallbackLearning,
        storageMode,
        storageError: describeError(error),
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

  async function saveLearningWorkspaceToService(state: LearningWorkspaceState): Promise<void> {
    if (learningStorage) {
      saveLearningWorkspace(learningStorage, state);
    }

    if (learningRepository) {
      await learningRepository.replaceWorkspace(state);
    }
  }

  async function saveSourceToService(source: SourceDocument): Promise<void> {
    if (learningStorage) {
      const current = loadLearningWorkspace(learningStorage);
      saveLearningWorkspace(learningStorage, {
        ...current,
        sources: [source, ...current.sources.filter((item) => item.id !== source.id)],
      });
    }

    if (learningRepository) {
      await learningRepository.saveSource(source);
    }
  }

  async function restore(snapshot: AppDataRestoreSnapshot): Promise<void> {
    await saveMaterials(snapshot.materialsState);
    await saveReviewLogsToService(snapshot.reviewLogs);
    await saveRewriteLogs(snapshot.rewriteLogs);
    await saveSettingsToService(snapshot.settings);
    await saveLearningWorkspaceToService(snapshot.learningWorkspace);
  }

  return {
    load: loadAfterPendingWrites,
    saveMaterials: (state) => enqueueWrite(() => saveMaterials(state)),
    saveReviewLogs: (logs) => enqueueWrite(() => saveReviewLogsToService(logs)),
    saveRewriteLogs: (logs) => enqueueWrite(() => saveRewriteLogs(logs)),
    saveSettings: (settings) => enqueueWrite(() => saveSettingsToService(settings)),
    saveLearningWorkspace: (state) => enqueueWrite(() => saveLearningWorkspaceToService(state)),
    saveSource: (source) => enqueueWrite(() => saveSourceToService(source)),
    restore: (snapshot) => enqueueWrite(() => restore(snapshot)),
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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
