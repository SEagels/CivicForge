import { useCallback, useMemo, useState } from "react";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { MaterialInspector } from "./MaterialInspector";
import { MaterialList } from "./MaterialList";
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
  const [state, setState] = useState(createInitialMaterialState);
  const activeMaterials = useMemo(() => getActiveMaterials(state), [state]);
  const selectedMaterial = useMemo(() => getSelectedMaterial(state), [state]);

  const updateSelected = useCallback((patch: MaterialPatch) => {
    setState((current) => updateSelectedMaterial(current, patch));
  }, []);

  const updateContent = useCallback(
    (contentMd: string) => {
      updateSelected({ contentMd, excerpt: contentMd.slice(0, 80) });
    },
    [updateSelected],
  );

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
        materials={activeMaterials}
        selectedId={state.selectedId}
        onSelect={(id) => setState((current) => selectMaterial(current, id))}
        onCreate={() => setState((current) => createMaterial(current))}
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
            <button type="button" className="primary-button" onClick={() => setState((current) => createMaterial(current))}>
              新建素材
            </button>
          </div>
        )}
      </section>

      <MaterialInspector
        material={selectedMaterial}
        onChange={updateSelected}
        onArchive={() => setState((current) => archiveSelectedMaterial(current))}
      />
    </main>
  );
}
