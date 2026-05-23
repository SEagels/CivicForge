import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReviewRating } from "../../domain/enums";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { ReviewPanel } from "../review/ReviewPanel";
import { RewritePanel } from "../rewrite/RewritePanel";
import { getBrowserRewriteStorage, loadRewriteLogs, saveRewriteLogs } from "../rewrite/rewritePersistence";
import { buildMaterialInputFromRewrite, type RewriteLog } from "../rewrite/rewriteWorkshop";
import { MaterialInspector } from "./MaterialInspector";
import { MaterialList } from "./MaterialList";
import {
  DEFAULT_MATERIAL_FILTERS,
  filterMaterials,
  getAvailableTags,
  hasActiveFilters,
  type MaterialFilters,
} from "./materialFilters";
import { getBrowserMaterialStorage, loadMaterialState, saveMaterialState } from "./materialPersistence";
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

type AppView = "library" | "review" | "rewrite";

export function MaterialLibrary() {
  const [state, setState] = useState(() => {
    const storage = getBrowserMaterialStorage();
    return storage ? loadMaterialState(storage) ?? createInitialMaterialState() : createInitialMaterialState();
  });
  const [filters, setFilters] = useState<MaterialFilters>(DEFAULT_MATERIAL_FILTERS);
  const [view, setView] = useState<AppView>("library");
  const [reviewFocusId, setReviewFocusId] = useState<string | null>(null);
  const [rewriteLogs, setRewriteLogs] = useState<readonly RewriteLog[]>(() => {
    const storage = getBrowserRewriteStorage();
    return storage ? loadRewriteLogs(storage) : [];
  });
  const activeMaterials = useMemo(() => getActiveMaterials(state), [state]);
  const filteredMaterials = useMemo(() => filterMaterials(activeMaterials, filters), [activeMaterials, filters]);
  const availableTags = useMemo(() => getAvailableTags(activeMaterials), [activeMaterials]);
  const selectedMaterial = useMemo(() => getSelectedMaterial(state), [state]);
  const filtersActive = hasActiveFilters(filters);

  useEffect(() => {
    const storage = getBrowserMaterialStorage();

    if (!storage) {
      return;
    }

    try {
      saveMaterialState(storage, state);
    } catch (error) {
      console.warn("Unable to save CivicForge material state.", error);
    }
  }, [state]);

  useEffect(() => {
    const storage = getBrowserRewriteStorage();

    if (!storage) {
      return;
    }

    try {
      saveRewriteLogs(storage, rewriteLogs);
    } catch (error) {
      console.warn("Unable to save CivicForge rewrite logs.", error);
    }
  }, [rewriteLogs]);

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
    setState((current) => createMaterial(current));
  }, []);

  const resetExampleMaterials = useCallback(() => {
    setFilters(DEFAULT_MATERIAL_FILTERS);
    setReviewFocusId(null);
    setState(createInitialMaterialState());
  }, []);

  const startSelectedReview = useCallback(() => {
    setReviewFocusId(state.selectedId);
    setView("review");
  }, [state.selectedId]);

  const rateMaterial = useCallback((materialId: string, rating: ReviewRating) => {
    setReviewFocusId(null);
    setState((current) => reviewMaterial(current, materialId, rating));
  }, []);

  const openLibrary = useCallback(() => {
    setView("library");
    setReviewFocusId(null);
  }, []);

  const openReview = useCallback(() => {
    setView("review");
    setReviewFocusId(null);
  }, []);

  const openRewrite = useCallback(() => {
    setView("rewrite");
    setReviewFocusId(null);
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

  return (
    <main className="desktop-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">CivicForge</div>
        <nav>
          <button type="button" className={view === "library" ? "active" : ""} onClick={openLibrary}>
            素材库
          </button>
          <button type="button" className={view === "review" ? "active" : ""} onClick={openReview}>
            复习
          </button>
          <button type="button" className={view === "rewrite" ? "active" : ""} onClick={openRewrite}>
            Rewrite
          </button>
          <a href="#tags">主题标签</a>
          <a href="#settings">设置</a>
        </nav>
      </aside>

      {view === "library" ? (
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
      ) : (
        <RewritePanel
          materials={activeMaterials}
          logs={rewriteLogs}
          onSaveLog={saveRewriteLog}
          onSaveAsMaterial={saveRewriteAsMaterial}
        />
      )}
    </main>
  );
}
