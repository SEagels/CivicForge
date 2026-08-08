import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ReviewRating } from "../domain/enums";
import { createAppDataService, type AppDataService, type StorageMode } from "../features/appData/appDataService";
import { DashboardPanel } from "../features/dashboard/DashboardPanel";
import {
  EMPTY_LEARNING_WORKSPACE,
  type KnowledgeCard,
  type LearningWorkspaceState,
  type SourceDocument,
  type StudyTask,
} from "../domain/learning";
import { MarkdownEditor } from "../features/editor/MarkdownEditor";
import { readArchiveFile, saveArchiveFile } from "../features/importExport/archiveFileAdapter";
import {
  createAppArchive,
  createArchiveFilename,
  parseAppArchive,
  serializeAppArchive,
} from "../features/importExport/appArchive";
import { ImportExportPanel } from "../features/importExport/ImportExportPanel";
import { applyReviewRating, readReviewSchedule } from "../features/review/reviewScheduler";
import {
  buildReviewLogEntry,
  type CompletedReviewSessionState,
  type ReviewLog,
} from "../features/review/reviewSession";
import { ReviewPanel } from "../features/review/ReviewPanel";
import {
  applyKnowledgeReviewCompletion,
  createMicroPracticeFromReview,
  type KnowledgeReviewCompletion,
} from "../features/review/knowledgeReview";
import {
  type RewriteLog,
  type RewriteMaterialInput,
} from "../features/rewrite/rewriteWorkshop";
import { DEFAULT_APP_SETTINGS, applyThemeMode, type AppSettings } from "../features/settings/appSettings";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { TodayPanel } from "../features/today/TodayPanel";
import { createStudySession, type StudyPlanMinutes } from "../features/today/todayPlan";
import { PracticePanel } from "../features/practice/PracticePanel";
import { createExercise } from "../features/practice/practiceModel";
import { ProgressPanel } from "../features/progress/ProgressPanel";
import {
  KnowledgeHubPanel,
  type LibrarySection,
} from "../features/learning/KnowledgeHubPanel";
import { MaterialInspector } from "../features/materials/MaterialInspector";
import { MaterialList } from "../features/materials/MaterialList";
import { getNextIntakeMaterialId } from "../features/materials/intakeAssistant";
import {
  DEFAULT_MATERIAL_FILTERS,
  filterMaterials,
  getAvailableTags,
  hasActiveFilters,
  type MaterialFilters,
} from "../features/materials/materialFilters";
import {
  archiveSelectedMaterial,
  confirmSelectedMaterial,
  confirmSelectedMaterialAndEnableReview,
  createInitialMaterialState,
  createMaterial,
  createMaterialFromSource,
  getActiveMaterials,
  getSelectedMaterial,
  reviewMaterial,
  selectMaterial,
  updateSelectedMaterial,
  type MaterialPatch,
} from "../features/materials/materialModel";
import {
  formatMaterialSaveStatus,
  type MaterialSaveStatus,
} from "../features/materials/materialSaveStatus";
import { getMaterialDuplicateHints } from "../features/materials/materialQuality";
import { getWorkbenchCandidates, getWorkbenchStats } from "../features/materials/materialWorkbench";
import { CommandPalette, type AppCommand } from "./CommandPalette";
import {
  createAppRoute,
  getRouteStorage,
  loadStoredAppRoute,
  saveStoredAppRoute,
  type AppRouteId,
} from "./appRoute";

const STORAGE_MODE_PREVIEW = "Preview localStorage";

export function AppShell() {
  const [state, setState] = useState(createInitialMaterialState);
  const [filters, setFilters] = useState<MaterialFilters>(DEFAULT_MATERIAL_FILTERS);
  const [route, setRoute] = useState(() => loadStoredAppRoute(getRouteStorage()));
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [reviewFocusId, setReviewFocusId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>(STORAGE_MODE_PREVIEW);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [reviewLogs, setReviewLogs] = useState<readonly ReviewLog[]>([]);
  const [rewriteLogs, setRewriteLogs] = useState<readonly RewriteLog[]>([]);
  const [learningWorkspace, setLearningWorkspace] = useState<LearningWorkspaceState>(EMPTY_LEARNING_WORKSPACE);
  const [librarySection, setLibrarySection] = useState<LibrarySection>("outputs");
  const [materialSaveStatus, setMaterialSaveStatus] = useState<MaterialSaveStatus>({ kind: "loading" });
  const dataServiceRef = useRef<AppDataService | null>(null);
  const hydratedRef = useRef(false);
  const materialSaveRunRef = useRef(0);

  const activeMaterials = useMemo(() => getActiveMaterials(state), [state]);
  const filteredMaterials = useMemo(() => filterMaterials(activeMaterials, filters), [activeMaterials, filters]);
  const workbenchCount = useMemo(() => getWorkbenchCandidates(activeMaterials).length, [activeMaterials]);
  const workbenchStats = useMemo(() => getWorkbenchStats(activeMaterials), [activeMaterials]);
  const availableTags = useMemo(() => getAvailableTags(activeMaterials), [activeMaterials]);
  const linkableMaterials = useMemo(
    () => activeMaterials.map((material) => ({ id: material.id, title: material.title })),
    [activeMaterials],
  );
  const selectedMaterial = useMemo(() => getSelectedMaterial(state), [state]);
  const selectedDuplicateHints = useMemo(
    () => (selectedMaterial ? getMaterialDuplicateHints(selectedMaterial, activeMaterials) : []),
    [activeMaterials, selectedMaterial],
  );
  const filtersActive = hasActiveFilters(filters);
  const nextIntakeMaterialId = useMemo(
    () => getNextIntakeMaterialId(activeMaterials, state.selectedId),
    [activeMaterials, state.selectedId],
  );
  const archiveJson = useMemo(
    () =>
      serializeAppArchive(
        createAppArchive({
          materialsState: state,
          reviewLogs,
          rewriteLogs,
          settings,
          learningWorkspace,
        }),
      ),
    [learningWorkspace, reviewLogs, rewriteLogs, settings, state],
  );
  const view = route.id;

  useEffect(() => {
    let cancelled = false;

    async function loadAppData() {
      const service = createAppDataService();
      dataServiceRef.current = service;
      const snapshot = await service.load();

      if (cancelled) {
        return;
      }

      setState(snapshot.materialsState);
      setReviewLogs(snapshot.reviewLogs);
      setRewriteLogs(snapshot.rewriteLogs);
      setSettings(snapshot.settings);
      setLearningWorkspace(snapshot.learningWorkspace);
      setStorageMode(snapshot.storageMode);
      setStorageError(snapshot.storageError);
      hydratedRef.current = true;
      setMaterialSaveStatus({ kind: "saved", savedAt: new Date().toISOString() });
    }

    void loadAppData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const runId = ++materialSaveRunRef.current;
    setMaterialSaveStatus({ kind: "saving" });

    void dataServiceRef.current
      ?.saveMaterials(state)
      .then(() => {
        if (materialSaveRunRef.current === runId) {
          setMaterialSaveStatus({ kind: "saved", savedAt: new Date().toISOString() });
        }
      })
      .catch((error) => {
        console.warn("Unable to save CivicForge material state.", error);
        if (materialSaveRunRef.current === runId) {
          setMaterialSaveStatus({ kind: "error" });
        }
      });
  }, [state]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    void dataServiceRef.current?.saveReviewLogs(reviewLogs).catch((error) => {
      console.warn("Unable to save CivicForge review logs.", error);
    });
  }, [reviewLogs]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    void dataServiceRef.current?.saveRewriteLogs(rewriteLogs).catch((error) => {
      console.warn("Unable to save CivicForge rewrite logs.", error);
    });
  }, [rewriteLogs]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    void dataServiceRef.current?.saveLearningWorkspace(learningWorkspace).catch((error) => {
      console.warn("Unable to save CivicForge learning workspace.", error);
    });
  }, [learningWorkspace]);

  useEffect(() => {
    applyThemeMode(settings);

    if (!hydratedRef.current) {
      return;
    }

    void dataServiceRef.current?.saveSettings(settings).catch((error) => {
      console.warn("Unable to save CivicForge settings.", error);
    });
  }, [settings]);

  useEffect(() => {
    saveStoredAppRoute(getRouteStorage(), route);
  }, [route]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in globalThis)) {
      return;
    }

    let disposed = false;
    const unlisteners: Array<() => void> = [];
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const unlistenRoute = await listen<{
        route: AppRouteId;
        entityId: string | null;
        librarySection: Exclude<LibrarySection, "outputs"> | null;
      }>(
        "widget-open-route",
        ({ payload }) => {
          if (disposed) return;
          if (payload.route === "library" && payload.librarySection) {
            setLibrarySection(payload.librarySection);
          }
          setRoute(createAppRoute(payload.route, payload.entityId));
          if (payload.route === "review") setReviewFocusId(payload.entityId);
        },
      );
      const unlistenEntity = await listen("entity-changed", () => {
        void dataServiceRef.current?.load().then((snapshot) => {
          if (!disposed) setLearningWorkspace(snapshot.learningWorkspace);
        });
      });
      unlisteners.push(unlistenRoute, unlistenEntity);
    });

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  const updateSelected = useCallback((patch: MaterialPatch) => {
    setState((current) => updateSelectedMaterial(current, patch));
  }, []);

  const updateFilters = useCallback((patch: Partial<MaterialFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const updateContent = useCallback(
    (contentMd: string) => {
      updateSelected({ contentMd, excerpt: contentMd.slice(0, 80) });
    },
    [updateSelected],
  );

  const createVisibleMaterial = useCallback(() => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setRoute(createAppRoute("library"));
    setState((current) => createMaterial(current));
  }, []);

  const resetExampleMaterials = useCallback(() => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setState(createInitialMaterialState());
  }, []);

  const openView = useCallback((nextView: AppRouteId, entityId: string | null = null) => {
    setRoute(createAppRoute(nextView, entityId));
    setReviewFocusId(null);
  }, []);

  const openLibrary = useCallback(() => openView("library"), [openView]);
  const openLibrarySection = useCallback((section: LibrarySection) => {
    setLibrarySection(section);
    openView("library");
  }, [openView]);
  const openPractice = useCallback(() => openView("practice"), [openView]);
  const openReview = useCallback(() => openView("review"), [openView]);
  const openImportExport = useCallback(() => openView("importExport"), [openView]);

  const openMaterialInLibrary = useCallback((materialId: string) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setLibrarySection("outputs");
    setState((current) => selectMaterial(current, materialId));
    setRoute(createAppRoute("library", materialId));
  }, []);

  const startSelectedReview = useCallback(() => {
    setReviewFocusId(state.selectedId);
    setRoute(createAppRoute("review", state.selectedId));
  }, [state.selectedId]);

  const startSelectedRewrite = useCallback(() => {
    const material = state.materials.find((item) => item.id === state.selectedId);
    if (!material) return;
    const now = new Date();
    const exerciseId = `exercise-polish-${now.getTime()}`;
    setLearningWorkspace((current) => ({
      ...current,
      exercises: [{
        id: exerciseId,
        title: `表达打磨：${material.title}`,
        promptMd: "请对照原文，从要点、结构、逻辑、表达和规范性五个维度完成复盘修改。",
        questionTypeSlug: material.questionTypeSlugs[0] ?? "analysis",
        wordLimit: null,
        timeLimitMinutes: 15,
        status: "active",
        currentStage: "reflection",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }, ...current.exercises],
      attempts: [{
        id: `attempt-polish-${now.getTime()}`,
        exerciseId,
        outlineMd: "",
        answerMd: material.contentMd,
        status: "submitted",
        startedAt: now.toISOString(),
        finishedAt: now.toISOString(),
        elapsedMs: 0,
        updatedAt: now.toISOString(),
      }, ...current.attempts],
    }));
    setRoute(createAppRoute("practice", exerciseId));
  }, [state.materials, state.selectedId]);

  const confirmSelected = useCallback(() => {
    setState((current) => confirmSelectedMaterial(current));
  }, []);

  const confirmSelectedAndEnableReview = useCallback(() => {
    setState((current) => confirmSelectedMaterialAndEnableReview(current));
  }, []);

  const selectNextIntakeMaterial = useCallback(() => {
    setState((current) => {
      const nextId = getNextIntakeMaterialId(getActiveMaterials(current), current.selectedId);
      return nextId ? selectMaterial(current, nextId) : current;
    });
  }, []);

  const rateMaterial = useCallback(
    (materialId: string, rating: ReviewRating, session: CompletedReviewSessionState) => {
      const previousMaterial = state.materials.find((material) => material.id === materialId);
      const reviewedAt = new Date(session.completedAt);
      const nextMaterial = previousMaterial ? applyReviewRating(previousMaterial, rating, reviewedAt) : null;

      setReviewFocusId(null);
      setState((current) => reviewMaterial(current, materialId, rating, reviewedAt));

      if (previousMaterial && nextMaterial) {
        const log = buildReviewLogEntry(previousMaterial, readReviewSchedule(previousMaterial), nextMaterial, session);
        setReviewLogs((current) => [log, ...current.filter((item) => item.id !== log.id)]);
      }
    },
    [state.materials],
  );

  const completeKnowledgeReview = useCallback((completion: KnowledgeReviewCompletion) => {
    setReviewFocusId(null);
    setLearningWorkspace((current) => applyKnowledgeReviewCompletion(current, completion));
  }, []);

  const createReviewMicroPractice = useCallback((reviewCardId: string) => {
    const now = new Date();
    const next = createMicroPracticeFromReview(learningWorkspace, reviewCardId, now);
    const exerciseId = `exercise-review-${now.getTime()}`;
    setLearningWorkspace(next);
    if (next.exercises.some((item) => item.id === exerciseId)) {
      setRoute(createAppRoute("practice", exerciseId));
    }
  }, [learningWorkspace]);

  const saveSourceAsMaterial = useCallback((input: RewriteMaterialInput) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setState((current) => createMaterialFromSource(current, input));
    setRoute(createAppRoute("library"));
  }, []);

  const openKnowledgeCardInLibrary = useCallback((cardId: string) => {
    setLibrarySection("cards");
    setReviewFocusId(null);
    setRoute(createAppRoute("library", cardId));
  }, []);

  const createPractice = useCallback(() => {
    const created = createExercise();
    setLearningWorkspace((current) => ({
      ...current,
      exercises: [created.exercise, ...current.exercises],
      attempts: [created.attempt, ...current.attempts],
    }));
    setRoute(createAppRoute("practice", created.exercise.id));
  }, []);

  const startStudyPlan = useCallback((minutes: StudyPlanMinutes, tasks: readonly StudyTask[]) => {
    const created = createStudySession(tasks, minutes);
    setLearningWorkspace((current) => ({
      ...current,
      sessions: [created.session, ...current.sessions.filter((item) => item.status !== "active")],
      sessionItems: [...created.items, ...current.sessionItems.filter((item) => item.sessionId !== created.session.id)],
    }));
    const first = created.items[0]?.task;
    if (first) {
      openStudyTask(first);
    }
  }, []);

  const quickCapture = useCallback((text: string) => {
    const now = new Date();
    const source: SourceDocument = {
      id: `source-${now.getTime()}`,
      title: text.trim().split(/\r?\n/)[0]?.slice(0, 40) || "快速记录",
      sourceType: "note",
      contentMd: text.trim(),
      sourceUri: "",
      publisher: "",
      publishedAt: null,
      status: "draft",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    setLearningWorkspace((current) => ({ ...current, sources: [source, ...current.sources] }));
  }, []);

  const extractAttemptCard = useCallback((attemptId: string, contentMd: string) => {
    const now = new Date();
    const attempt = learningWorkspace.attempts.find((item) => item.id === attemptId);
    const exercise = learningWorkspace.exercises.find((item) => item.id === attempt?.exerciseId);
    const card: KnowledgeCard = {
      id: `card-${now.getTime()}`,
      title: `${exercise?.title || "练习"}：修改稿提炼`,
      contentMd,
      summary: contentMd.replace(/\s+/g, " ").slice(0, 100),
      cardType: "standard-expression",
      topicSlug: "",
      lifecycle: "refining",
      verificationStatus: "unverified",
      core: false,
      reviewEnabled: false,
      sourceLabel: "训练复盘",
      tagNames: ["训练提取"],
      questionTypeSlugs: exercise ? [exercise.questionTypeSlug] : [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    setLearningWorkspace((current) => ({
      ...current,
      cards: [card, ...current.cards],
      cardSources: [{ cardId: card.id, sourceDocumentId: null, sourceExcerptId: null, attemptId, relationType: "extracted-from", createdAt: now.toISOString() }, ...current.cardSources],
    }));
  }, [learningWorkspace.attempts, learningWorkspace.exercises]);

  const openStudyTask = useCallback((task: StudyTask) => {
    if (task.kind === "review" && task.entityId) {
      setReviewFocusId(task.entityId);
      setRoute(createAppRoute("review", task.entityId));
      return;
    }
    if ((task.kind === "practice" || task.kind === "reflection") && task.entityId) {
      setRoute(createAppRoute("practice", task.entityId));
      return;
    }
    setRoute(createAppRoute("library", task.entityId));
  }, []);

  const downloadArchive = useCallback(() => {
    void saveArchiveFile(archiveJson, createArchiveFilename()).catch((error) => {
      console.warn("Unable to export CivicForge archive.", error);
    });
  }, [archiveJson]);

  const restoreArchive = useCallback((rawArchive: string): boolean => {
    const archive = parseAppArchive(rawArchive);

    if (!archive) {
      return false;
    }

    setState(archive.materialsState);
    setReviewLogs(archive.reviewLogs);
    setRewriteLogs(archive.rewriteLogs);
    setSettings(archive.settings);
    setLearningWorkspace(archive.learningWorkspace);
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setRoute(createAppRoute("today"));
    return true;
  }, []);

  const restoreArchiveFromFile = useCallback(async (): Promise<boolean> => {
    const result = await readArchiveFile();

    if (!result.ok) {
      return false;
    }

    return restoreArchive(result.content);
  }, [restoreArchive]);

  const commands = useMemo<readonly AppCommand[]>(
    () => [
      { id: "today", label: "今天", hint: "打开今日学习计划", keywords: ["Dashboard"], run: () => openView("today") },
      { id: "practice", label: "训练", hint: "打开申论训练工作台", keywords: ["答题", "调用"], run: openPractice },
      { id: "library", label: "素材", hint: "打开资料与知识卡片", keywords: ["素材库"], run: openLibrary },
      { id: "review", label: "复习", hint: "开始主动回忆", keywords: ["Anki"], run: openReview },
      { id: "progress", label: "进度", hint: "查看主题与题型覆盖", keywords: ["统计"], run: () => openView("progress") },
      { id: "new-material", label: "新建素材", hint: "创建一条待加工素材", keywords: ["记录"], run: createVisibleMaterial },
      { id: "polish", label: "表达打磨", hint: "在训练复盘中修改一份作答", keywords: ["Rewrite", "改写"], run: openPractice },
      { id: "import", label: "导入导出", hint: "备份或恢复本地数据", keywords: ["备份"], run: openImportExport },
      { id: "settings", label: "设置", hint: "主题、存储和小组件", keywords: ["偏好"], run: () => openView("settings") },
    ],
    [createVisibleMaterial, openImportExport, openLibrary, openPractice, openReview, openView],
  );

  return (
    <main className="desktop-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">CivicForge</div>
        <nav>
          <div className="navigation-section-label">学习</div>
          <NavButton active={view === "today"} onClick={() => openView("today")}>
            今天
          </NavButton>
          <NavButton active={view === "practice"} onClick={openPractice}>
            训练
          </NavButton>
          <NavButton active={view === "library"} onClick={openLibrary}>
            素材
          </NavButton>
          {view === "library" ? (
            <div className="sidebar-subnav">
              <button type="button" className={librarySection === "sources" ? "active" : ""} onClick={() => openLibrarySection("sources")}>资料收件箱</button>
              <button type="button" className={librarySection === "cards" ? "active" : ""} onClick={() => openLibrarySection("cards")}>知识卡</button>
              <button type="button" className={librarySection === "outputs" ? "active" : ""} onClick={() => openLibrarySection("outputs")}>成品</button>
            </div>
          ) : null}
          <NavButton active={view === "review"} onClick={openReview}>
            复习
          </NavButton>
          <NavButton active={view === "progress"} onClick={() => openView("progress")}>
            进度
          </NavButton>
          <div className="navigation-section-label">工具</div>
          <NavButton active={view === "importExport"} onClick={openImportExport}>
            导入导出
          </NavButton>
          <NavButton active={view === "settings"} onClick={() => openView("settings")}>
            设置
          </NavButton>
        </nav>
      </aside>

      {view === "today" ? (
        <TodayPanel
          materials={state.materials}
          workspace={learningWorkspace}
          storageMode={storageMode}
          storageError={storageError}
          onStartPlan={startStudyPlan}
          onOpenTask={openStudyTask}
          onQuickCapture={quickCapture}
        />
      ) : view === "library" && librarySection !== "outputs" ? (
        <KnowledgeHubPanel
          section={librarySection}
          focusedId={route.entityId}
          workspace={learningWorkspace}
          onSectionChange={openLibrarySection}
          onChange={setLearningWorkspace}
        />
      ) : view === "library" ? (
        <>
          <MaterialList
            materials={filteredMaterials}
            selectedId={state.selectedId}
            filters={filters}
            totalCount={activeMaterials.length}
            workbenchCount={workbenchCount}
            workbenchStats={workbenchStats}
            tags={availableTags}
            hasActiveFilters={filtersActive}
            onSelect={(id) => setState((current) => selectMaterial(current, id))}
            onCreate={createVisibleMaterial}
            onFiltersChange={updateFilters}
            onClearFilters={() => setFilters(DEFAULT_MATERIAL_FILTERS)}
          />

          <section className="editor-pane" aria-label="编辑器">
            {selectedMaterial ? (
              <>
                <div className="editor-title-row">
                  <input
                    className="title-input"
                    value={selectedMaterial.title}
                    onChange={(event) => updateSelected({ title: event.target.value })}
                    aria-label="素材标题"
                  />
                  <span className={`save-status ${materialSaveStatus.kind}`} aria-live="polite">
                    {formatMaterialSaveStatus(materialSaveStatus)}
                  </span>
                </div>
                <MarkdownEditor
                  materialId={selectedMaterial.id}
                  value={selectedMaterial.contentMd}
                  linkableMaterials={linkableMaterials}
                  onChange={updateContent}
                />
              </>
            ) : (
              <div className="empty-state">
                <h1>没有可编辑素材</h1>
                <button type="button" className="primary-button" onClick={createVisibleMaterial}>
                  新建素材
                </button>
              </div>
            )}
          </section>

          <MaterialInspector
            material={selectedMaterial}
            duplicateHints={selectedDuplicateHints}
            onChange={updateSelected}
            onArchive={() => setState((current) => archiveSelectedMaterial(current))}
            onConfirm={confirmSelected}
            onConfirmAndEnableReview={confirmSelectedAndEnableReview}
            onStartReview={startSelectedReview}
            onStartRewrite={startSelectedRewrite}
            onSelectNextIntakeMaterial={selectNextIntakeMaterial}
            hasNextIntakeMaterial={Boolean(nextIntakeMaterialId)}
            onResetExamples={resetExampleMaterials}
          />
        </>
      ) : view === "practice" ? (
        <PracticePanel
          workspace={learningWorkspace}
          focusedExerciseId={route.entityId}
          onChange={setLearningWorkspace}
          onCreate={createPractice}
          onExtractCard={extractAttemptCard}
        />
      ) : view === "review" ? (
        <ReviewPanel
          workspace={learningWorkspace}
          materials={activeMaterials}
          reviewLogs={reviewLogs}
          focusedMaterialId={reviewFocusId}
          onRate={rateMaterial}
          onBackToLibrary={openLibrary}
          onEditMaterial={openMaterialInLibrary}
          onCompleteKnowledgeReview={completeKnowledgeReview}
          onEditKnowledgeCard={openKnowledgeCardInLibrary}
          onCreateMicroPractice={createReviewMicroPractice}
        />
      ) : view === "progress" ? (
        <ProgressPanel
          materials={state.materials}
          workspace={learningWorkspace}
          reviewLogs={reviewLogs}
          onOpenPractice={openPractice}
          onOpenReview={openReview}
          onOpenKnowledgeCard={openKnowledgeCardInLibrary}
          rewriteLogs={rewriteLogs}
        />
      ) : view === "importExport" ? (
        <ImportExportPanel
          archiveJson={archiveJson}
          onDownloadArchive={downloadArchive}
          onRestoreArchive={restoreArchive}
          onRestoreFromFile={restoreArchiveFromFile}
          onCreateSourceMaterial={saveSourceAsMaterial}
        />
      ) : (
        <SettingsPanel
          settings={settings}
          storageMode={storageMode}
          materialCount={activeMaterials.length}
          rewriteLogCount={rewriteLogs.length}
          onSettingsChange={setSettings}
          onExportArchive={downloadArchive}
          onOpenImportExport={openImportExport}
          onResetExamples={resetExampleMaterials}
        />
      )}
      <CommandPalette open={commandPaletteOpen} commands={commands} onClose={() => setCommandPaletteOpen(false)} />
    </main>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {children}
    </button>
  );
}
