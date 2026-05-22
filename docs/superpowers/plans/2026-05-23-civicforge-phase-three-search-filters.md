# CivicForge Phase Three Search Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add usable search and metadata filtering to the in-memory material library while preparing the UI for the later SQLite FTS5 repository layer.

**Architecture:** Keep the query/filter logic in a pure TypeScript module with unit tests. React components receive filter state and callbacks from `MaterialLibrary`, so the later SQLite-backed repository can replace the in-memory filter without rewriting UI controls.

**Tech Stack:** React, TypeScript, Vitest, current in-memory material state, future-compatible SQLite FTS5 terminology.

---

### Task 1: Filter Model

**Files:**
- Create: `src/features/materials/materialFilters.ts`
- Create: `src/features/materials/materialFilters.test.ts`

- [ ] **Step 1: Write failing tests for keyword and metadata filters**

Run:

```powershell
npm test -- src/features/materials/materialFilters.test.ts --run
```

Expected: FAIL because `materialFilters.ts` does not exist.

- [ ] **Step 2: Implement filter helpers**

Expected: `filterMaterials`, `DEFAULT_MATERIAL_FILTERS`, `getAvailableTags`, and `hasActiveFilters` cover query, topic, material type, question type, tag, favorite-only, and review-only filtering.

- [ ] **Step 3: Run filter tests**

Run:

```powershell
npm test -- src/features/materials/materialFilters.test.ts --run
```

Expected: PASS.

### Task 2: Search And Filter UI

**Files:**
- Modify: `src/features/materials/MaterialLibrary.tsx`
- Modify: `src/features/materials/MaterialList.tsx`
- Modify: `src/features/materials/MaterialInspector.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add controlled search and filter controls**

Expected: List pane exposes keyword search, topic, material type, question type, tag, favorite-only, and review-only controls.

- [ ] **Step 2: Add result count and empty state**

Expected: Users can see filtered count and clear active filters.

- [ ] **Step 3: Enhance inspector metadata**

Expected: Inspector supports favorite toggle and shows word count, tag count, and review status.

### Task 3: Documentation And Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document phase-three behavior**

Expected: README notes that search/filtering currently runs in memory and will later be backed by SQLite FTS5.

- [ ] **Step 2: Run verification**

Run:

```powershell
npm test -- --run
npm run typecheck
npm run build
```

Expected: PASS, allowing the existing Milkdown bundle-size warning.

- [ ] **Step 3: Browser smoke test**

Expected: Opening `http://127.0.0.1:1420` shows filters; searching `数字政府` narrows the list; clearing filters restores the list.
