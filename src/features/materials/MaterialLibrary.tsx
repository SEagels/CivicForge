import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ReviewRating } from "../../domain/enums";
import { AnswerWorkbenchPanel } from "../answer/AnswerWorkbenchPanel";
import type { AnswerMaterialInput, AnswerRewriteDraft } from "../answer/answerWorkbench";
import { createAppDataService, type AppDataService, type StorageMode } from "../appData/appDataService";
import { DashboardPanel } from "../dashboard/DashboardPanel";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { GraphPanel } from "../graph/GraphPanel";
import { readArchiveFile, saveArchiveFile } from "../importExport/archiveFileAdapter";
import {
  createAppArchive,
  createArchiveFilename,
  parseAppArchive,
  serializeAppArchive,
} from "../importExport/appArchive";
import { ImportExportPanel } from "../importExport/ImportExportPanel";
import { applyReviewRating, readReviewSchedule } from "../review/reviewScheduler";
import { buildReviewLogEntry, type CompletedReviewSessionState, type ReviewLog } from "../review/reviewSession";
import { ReviewPanel } from "../review/ReviewPanel";
import { RewritePanel } from "../rewrite/RewritePanel";
import { buildMaterialInputFromRewrite, type RewriteLog, type RewriteMaterialInput } from "../rewrite/rewriteWorkshop";
import { DEFAULT_APP_SETTINGS, applyThemeMode, type AppSettings } from "../settings/appSettings";
import { SettingsPanel } from "../settings/SettingsPanel";
import { TaxonomyPanel } from "../taxonomy/TaxonomyPanel";
import { MaterialInspector } from "./MaterialInspector";
import { MaterialList } from "./MaterialList";
import { getNextIntakeMaterialId } from "./intakeAssistant";
import {
  DEFAULT_MATERIAL_FILTERS,
  filterMaterials,
  getAvailableTags,
  hasActiveFilters,
  type MaterialFilters,
} from "./materialFilters";
import {
  archiveSelectedMaterial,
  confirmSelectedMaterial,
  confirmSelectedMaterialAndEnableReview,
  createInitialMaterialState,
  createMaterial,
  createMaterialFromAnswerDraft,
  createMaterialFromSource,
  createMaterialFromRewrite,
  getActiveMaterials,
  getSelectedMaterial,
  reviewMaterial,
  selectMaterial,
  updateSelectedMaterial,
  type MaterialPatch,
} from "./materialModel";
import { formatMaterialSaveStatus, type MaterialSaveStatus } from "./materialSaveStatus";
import { getMaterialDuplicateHints } from "./materialQuality";
import { getWorkbenchCandidates, getWorkbenchStats } from "./materialWorkbench";

type AppView =
  | "dashboard"
  | "library"
  | "answer"
  | "review"
  | "rewrite"
  | "graph"
  | "taxonomy"
  | "importExport"
  | "settings";

const STORAGE_MODE_PREVIEW = "Preview localStorage";

export function MaterialLibrary() {
  const [state, setState] = useState(createInitialMaterialState);
  const [filters, setFilters] = useState<MaterialFilters>(DEFAULT_MATERIAL_FILTERS);
  const [view, setView] = useState<AppView>("dashboard");
  const [reviewFocusId, setReviewFocusId] = useState<string | null>(null);
  const [rewriteFocusId, setRewriteFocusId] = useState<string | null>(null);
  const [answerRewriteDraft, setAnswerRewriteDraft] = useState<AnswerRewriteDraft | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>(STORAGE_MODE_PREVIEW);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [reviewLogs, setReviewLogs] = useState<readonly ReviewLog[]>([]);
  const [rewriteLogs, setRewriteLogs] = useState<readonly RewriteLog[]>([]);
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
        }),
      ),
    [reviewLogs, rewriteLogs, settings, state],
  );

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
      setStorageMode(snapshot.storageMode);
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
    applyThemeMode(settings);

    if (!hydratedRef.current) {
      return;
    }

    void dataServiceRef.current?.saveSettings(settings).catch((error) => {
      console.warn("Unable to save CivicForge settings.", error);
    });
  }, [settings]);

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
    setView("library");
    setState((current) => createMaterial(current));
  }, []);

  const resetExampleMaterials = useCallback(() => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setState(createInitialMaterialState());
  }, []);

  const openView = useCallback((nextView: AppView) => {
    setView(nextView);
    setReviewFocusId(null);
    if (nextView !== "rewrite") {
      setRewriteFocusId(null);
      setAnswerRewriteDraft(null);
    }
  }, []);

  const openLibrary = useCallback(() => openView("library"), [openView]);
  const openAnswer = useCallback(() => openView("answer"), [openView]);
  const openReview = useCallback(() => openView("review"), [openView]);
  const openRewrite = useCallback(() => {
    setRewriteFocusId(null);
    setAnswerRewriteDraft(null);
    openView("rewrite");
  }, [openView]);
  const openImportExport = useCallback(() => openView("importExport"), [openView]);

  const openMaterialFromGraph = useCallback((materialId: string) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setState((current) => selectMaterial(current, materialId));
    setView("library");
  }, []);

  const openMaterialInLibrary = useCallback((materialId: string) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setRewriteFocusId(null);
    setState((current) => selectMaterial(current, materialId));
    setView("library");
  }, []);

  const startSelectedReview = useCallback(() => {
    setReviewFocusId(state.selectedId);
    setView("review");
  }, [state.selectedId]);

  const startSelectedRewrite = useCallback(() => {
    if (!state.selectedId) {
      return;
    }

    setRewriteFocusId(state.selectedId);
    setAnswerRewriteDraft(null);
    setReviewFocusId(null);
    setView("rewrite");
  }, [state.selectedId]);

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

  const saveRewriteLog = useCallback((log: RewriteLog) => {
    setRewriteLogs((current) => [log, ...current.filter((item) => item.id !== log.id)]);
  }, []);

  const saveRewriteAsMaterial = useCallback((log: RewriteLog) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setRewriteFocusId(null);
    setState((current) => createMaterialFromRewrite(current, buildMaterialInputFromRewrite(log)));
    setView("library");
  }, []);

  const saveSourceAsMaterial = useCallback((input: RewriteMaterialInput) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setState((current) => createMaterialFromSource(current, input));
    setView("library");
  }, []);

  const saveAnswerDraftAsMaterial = useCallback((input: AnswerMaterialInput) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setRewriteFocusId(null);
    setState((current) => createMaterialFromAnswerDraft(current, input));
    setView("library");
  }, []);

  const sendAnswerDraftToRewrite = useCallback((draft: AnswerRewriteDraft) => {
    setReviewFocusId(null);
    setRewriteFocusId(null);
    setAnswerRewriteDraft(draft);
    setView("rewrite");
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
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setView("dashboard");
    return true;
  }, []);

  const restoreArchiveFromFile = useCallback(async (): Promise<boolean> => {
    const result = await readArchiveFile();

    if (!result.ok) {
      return false;
    }

    return restoreArchive(result.content);
  }, [restoreArchive]);

  return (
    <main className="desktop-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">CivicForge</div>
        <nav>
          <NavButton active={view === "dashboard"} onClick={() => openView("dashboard")}>
            Dashboard
          </NavButton>
          <NavButton active={view === "library"} onClick={openLibrary}>
            素材库
          </NavButton>
          <NavButton active={view === "answer"} onClick={openAnswer}>
            调用工作台
          </NavButton>
          <NavButton active={view === "review"} onClick={openReview}>
            复习
          </NavButton>
          <NavButton active={view === "rewrite"} onClick={openRewrite}>
            Rewrite
          </NavButton>
          <NavButton active={view === "graph"} onClick={() => openView("graph")}>
            知识图谱
          </NavButton>
          <NavButton active={view === "taxonomy"} onClick={() => openView("taxonomy")}>
            主题标签
          </NavButton>
          <NavButton active={view === "importExport"} onClick={openImportExport}>
            导入导出
          </NavButton>
          <NavButton active={view === "settings"} onClick={() => openView("settings")}>
            设置备份
          </NavButton>
        </nav>
      </aside>

      {view === "dashboard" ? (
        <DashboardPanel
          materials={state.materials}
          rewriteLogs={rewriteLogs}
          storageMode={storageMode}
          onOpenLibrary={createVisibleMaterial}
          onOpenReview={openReview}
          onOpenRewrite={openRewrite}
          onOpenImportExport={openImportExport}
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
      ) : view === "answer" ? (
        <AnswerWorkbenchPanel
          materials={activeMaterials}
          onSaveDraftAsMaterial={saveAnswerDraftAsMaterial}
          onSendToRewrite={sendAnswerDraftToRewrite}
        />
      ) : view === "review" ? (
        <ReviewPanel
          materials={activeMaterials}
          reviewLogs={reviewLogs}
          focusedMaterialId={reviewFocusId}
          onRate={rateMaterial}
          onBackToLibrary={openLibrary}
          onEditMaterial={openMaterialInLibrary}
        />
      ) : view === "rewrite" ? (
        <RewritePanel
          materials={activeMaterials}
          logs={rewriteLogs}
          focusedMaterialId={rewriteFocusId}
          initialDraft={answerRewriteDraft}
          onSaveLog={saveRewriteLog}
          onSaveAsMaterial={saveRewriteAsMaterial}
        />
      ) : view === "graph" ? (
        <GraphPanel materials={activeMaterials} onOpenMaterial={openMaterialFromGraph} />
      ) : view === "taxonomy" ? (
        <TaxonomyPanel materials={state.materials} />
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
