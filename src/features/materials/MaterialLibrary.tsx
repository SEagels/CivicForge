import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ReviewRating } from "../../domain/enums";
import { createAppDataService, type AppDataService, type StorageMode } from "../appData/appDataService";
import { DashboardPanel } from "../dashboard/DashboardPanel";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { readArchiveFile, saveArchiveFile } from "../importExport/archiveFileAdapter";
import {
  createAppArchive,
  createArchiveFilename,
  parseAppArchive,
  serializeAppArchive,
} from "../importExport/appArchive";
import { ImportExportPanel } from "../importExport/ImportExportPanel";
import { ReviewPanel } from "../review/ReviewPanel";
import { RewritePanel } from "../rewrite/RewritePanel";
import { buildMaterialInputFromRewrite, type RewriteLog } from "../rewrite/rewriteWorkshop";
import { DEFAULT_APP_SETTINGS, applyThemeMode, type AppSettings } from "../settings/appSettings";
import { SettingsPanel } from "../settings/SettingsPanel";
import { TaxonomyPanel } from "../taxonomy/TaxonomyPanel";
import { MaterialInspector } from "./MaterialInspector";
import { MaterialList } from "./MaterialList";
import {
  DEFAULT_MATERIAL_FILTERS,
  filterMaterials,
  getAvailableTags,
  hasActiveFilters,
  type MaterialFilters,
} from "./materialFilters";
import {
  archiveSelectedMaterial,
  createInitialMaterialState,
  createMaterial,
  createMaterialFromRewrite,
  getActiveMaterials,
  getSelectedMaterial,
  reviewMaterial,
  selectMaterial,
  updateSelectedMaterial,
  type MaterialPatch,
} from "./materialModel";

type AppView = "dashboard" | "library" | "review" | "rewrite" | "taxonomy" | "importExport" | "settings";

const STORAGE_MODE_PREVIEW = "Preview localStorage";

export function MaterialLibrary() {
  const [state, setState] = useState(createInitialMaterialState);
  const [filters, setFilters] = useState<MaterialFilters>(DEFAULT_MATERIAL_FILTERS);
  const [view, setView] = useState<AppView>("dashboard");
  const [reviewFocusId, setReviewFocusId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>(STORAGE_MODE_PREVIEW);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [rewriteLogs, setRewriteLogs] = useState<readonly RewriteLog[]>([]);
  const dataServiceRef = useRef<AppDataService | null>(null);
  const hydratedRef = useRef(false);

  const activeMaterials = useMemo(() => getActiveMaterials(state), [state]);
  const filteredMaterials = useMemo(() => filterMaterials(activeMaterials, filters), [activeMaterials, filters]);
  const availableTags = useMemo(() => getAvailableTags(activeMaterials), [activeMaterials]);
  const selectedMaterial = useMemo(() => getSelectedMaterial(state), [state]);
  const filtersActive = hasActiveFilters(filters);
  const archiveJson = useMemo(
    () =>
      serializeAppArchive(
        createAppArchive({
          materialsState: state,
          rewriteLogs,
          settings,
        }),
      ),
    [rewriteLogs, settings, state],
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
      setRewriteLogs(snapshot.rewriteLogs);
      setSettings(snapshot.settings);
      setStorageMode(snapshot.storageMode);
      hydratedRef.current = true;
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

    void dataServiceRef.current?.saveMaterials(state).catch((error) => {
      console.warn("Unable to save CivicForge material state.", error);
    });
  }, [state]);

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
  }, []);

  const openLibrary = useCallback(() => openView("library"), [openView]);
  const openReview = useCallback(() => openView("review"), [openView]);
  const openRewrite = useCallback(() => openView("rewrite"), [openView]);
  const openImportExport = useCallback(() => openView("importExport"), [openView]);

  const startSelectedReview = useCallback(() => {
    setReviewFocusId(state.selectedId);
    setView("review");
  }, [state.selectedId]);

  const rateMaterial = useCallback((materialId: string, rating: ReviewRating) => {
    setReviewFocusId(null);
    setState((current) => reviewMaterial(current, materialId, rating));
  }, []);

  const saveRewriteLog = useCallback((log: RewriteLog) => {
    setRewriteLogs((current) => [log, ...current.filter((item) => item.id !== log.id)]);
  }, []);

  const saveRewriteAsMaterial = useCallback((log: RewriteLog) => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setState((current) => createMaterialFromRewrite(current, buildMaterialInputFromRewrite(log)));
    setView("library");
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
          <NavButton active={view === "review"} onClick={openReview}>
            复习
          </NavButton>
          <NavButton active={view === "rewrite"} onClick={openRewrite}>
            Rewrite
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
                <input
                  className="title-input"
                  value={selectedMaterial.title}
                  onChange={(event) => updateSelected({ title: event.target.value })}
                  aria-label="素材标题"
                />
                <MarkdownEditor
                  materialId={selectedMaterial.id}
                  value={selectedMaterial.contentMd}
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
            onChange={updateSelected}
            onArchive={() => setState((current) => archiveSelectedMaterial(current))}
            onStartReview={startSelectedReview}
            onResetExamples={resetExampleMaterials}
          />
        </>
      ) : view === "review" ? (
        <ReviewPanel
          materials={activeMaterials}
          focusedMaterialId={reviewFocusId}
          onRate={rateMaterial}
          onBackToLibrary={openLibrary}
        />
      ) : view === "rewrite" ? (
        <RewritePanel
          materials={activeMaterials}
          logs={rewriteLogs}
          onSaveLog={saveRewriteLog}
          onSaveAsMaterial={saveRewriteAsMaterial}
        />
      ) : view === "taxonomy" ? (
        <TaxonomyPanel materials={state.materials} />
      ) : view === "importExport" ? (
        <ImportExportPanel
          archiveJson={archiveJson}
          onDownloadArchive={downloadArchive}
          onRestoreArchive={restoreArchive}
          onRestoreFromFile={restoreArchiveFromFile}
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
