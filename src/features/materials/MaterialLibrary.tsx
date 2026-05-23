import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "../editor/MarkdownEditor";
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
  getActiveMaterials,
  getSelectedMaterial,
  selectMaterial,
  updateSelectedMaterial,
  type MaterialPatch,
} from "./materialModel";

export function MaterialLibrary() {
  const [state, setState] = useState(() => {
    const storage = getBrowserMaterialStorage();
    return storage ? loadMaterialState(storage) ?? createInitialMaterialState() : createInitialMaterialState();
  });
  const [filters, setFilters] = useState<MaterialFilters>(DEFAULT_MATERIAL_FILTERS);
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
    setState(createInitialMaterialState());
  }, []);

  return (
    <main className="desktop-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">CivicForge</div>
        <nav>
          <a className="active" href="#library">
            素材库
          </a>
          <a href="#review">复习</a>
          <a href="#rewrite">Rewrite</a>
          <a href="#tags">主题标签</a>
          <a href="#settings">设置</a>
        </nav>
      </aside>

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
        onResetExamples={resetExampleMaterials}
      />
    </main>
  );
}
