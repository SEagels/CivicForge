# CivicForge Graph And iOS UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Obsidian-inspired material relationship graph and refresh CivicForge toward a cleaner iOS-like desktop interface.

**Architecture:** Keep graph data derivation pure in `graphModel.ts`, render the force layout with `d3-force` in a focused graph canvas, and integrate the new page through the existing `MaterialLibrary` view switch. UI styling remains centralized in `src/styles/global.css`.

**Tech Stack:** React, TypeScript, Vite, Tauri, Vitest, SVG, `d3-force`.

---

## Files

- Create: `src/features/graph/graphModel.ts` for graph node/edge construction, wiki-link parsing, and filtering.
- Create: `src/features/graph/graphModel.test.ts` for graph behavior tests.
- Create: `src/features/graph/GraphCanvas.tsx` for SVG force-directed rendering.
- Create: `src/features/graph/GraphPanel.tsx` for controls, details, and graph page layout.
- Modify: `src/features/materials/MaterialLibrary.tsx` to add the `graph` view, nav item, and material jump callback.
- Modify: `src/styles/global.css` for graph layout and iOS-like visual refresh.
- Modify: `package.json` and `package-lock.json` by installing `d3-force` and `@types/d3-force`.

## Task 1: Add Graph Dependencies

- [ ] **Step 1: Install focused graph dependencies**

Run:

```powershell
npm install d3-force
npm install -D @types/d3-force
```

Expected: `package.json` includes `d3-force` and dev dependency `@types/d3-force`.

- [ ] **Step 2: Verify dependency install did not dirty unexpected files**

Run:

```powershell
git status --short
```

Expected: only `package.json` and `package-lock.json` change from dependency installation.

## Task 2: Build Pure Graph Model With TDD

- [ ] **Step 1: Write failing tests**

Create `src/features/graph/graphModel.test.ts` with tests that call:

```ts
buildKnowledgeGraph(materials)
filterKnowledgeGraph(graph, filters)
extractMaterialLinks(contentMd)
```

The tests must cover metadata edges, `[[素材标题]]` links, missing links, duplicate links, and search/type filtering.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run src/features/graph/graphModel.test.ts
```

Expected: FAIL because `graphModel.ts` does not exist.

- [ ] **Step 3: Implement pure graph model**

Create `src/features/graph/graphModel.ts` with:

```ts
export type GraphNodeKind = "material" | "topic" | "tag" | "questionType" | "materialType";
export type GraphEdgeKind = "material-topic" | "material-tag" | "material-question-type" | "material-type" | "material-link";
```

Implement stable IDs, de-duplicated edges, and exact title matching for wiki links.

- [ ] **Step 4: Run model tests**

Run:

```powershell
npx vitest run src/features/graph/graphModel.test.ts
```

Expected: PASS.

## Task 3: Add Graph Page And Canvas

- [ ] **Step 1: Create SVG force canvas**

Create `src/features/graph/GraphCanvas.tsx`. It accepts graph data, selected node id, hover id, and callbacks. Use `d3-force` simulation to calculate node positions and render SVG circles, labels, and lines.

- [ ] **Step 2: Create graph panel**

Create `src/features/graph/GraphPanel.tsx`. It builds the graph from active materials, manages search/filter/selected state, renders controls, canvas, and selected-node details.

- [ ] **Step 3: Type-check graph UI**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

## Task 4: Integrate Navigation And Material Jump

- [ ] **Step 1: Add graph view**

Modify `src/features/materials/MaterialLibrary.tsx`:

- Extend `AppView` with `graph`.
- Import `GraphPanel`.
- Add `知识图谱` nav button.
- Render `GraphPanel`.
- Add `openMaterialFromGraph(materialId)` that selects material, clears filters/review focus, and switches to Library.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

## Task 5: Apply iOS-Like UI Refresh

- [ ] **Step 1: Add graph and visual CSS**

Modify `src/styles/global.css`:

- Add graph workspace/canvas/details styles.
- Add softer transitions for nav, buttons, cards, material cards, graph nodes.
- Keep responsive breakpoints from the previous phase.
- Keep dark mode usable.

- [ ] **Step 2: Build frontend**

Run:

```powershell
npm run build
```

Expected: PASS. Existing Milkdown chunk warning is acceptable.

## Task 6: Full Verification

- [ ] **Step 1: Run tests**

Run:

```powershell
npx vitest run --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck and build**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 3: Run Tauri build**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
npx tauri build
```

Expected: release executable, MSI, and NSIS bundles build successfully.

- [ ] **Step 4: Browser smoke test**

Start Vite and inspect:

- Dashboard.
- Library.
- Knowledge graph.
- Settings.
- Narrow-width responsive behavior.

Expected: graph is visible and UI does not horizontally overflow.

## Self-Review

- Spec coverage: graph model, graph UI, app integration, iOS-style CSS, tests, browser smoke, and Tauri build are covered.
- Placeholder scan: no placeholder tasks remain.
- Type consistency: `GraphNodeKind`, `GraphEdgeKind`, `buildKnowledgeGraph`, `filterKnowledgeGraph`, and `extractMaterialLinks` names are used consistently.

