# CivicForge Phase Five Review Module Implementation Plan

**Goal:** Add the first lightweight Anki-style review module with due queue, today count, four ratings, material jump-in, and local preview persistence.

**Architecture:** Keep the scheduling algorithm in a pure TypeScript module. Store review schedule fields on `MaterialDraft`, matching the SQLite `materials` review columns. Reuse the existing `MaterialLibrary` state and `localStorage` bridge until Tauri SQLite runtime integration is available.

**Tech Stack:** React, TypeScript, Vitest, existing material state persistence.

---

### Task 1: Review Scheduler Core

**Files:**
- Create: `src/features/review/reviewScheduler.ts`
- Create: `src/features/review/reviewScheduler.test.ts`

- [x] **Step 1: Write failing tests for due queue, today count, and ratings**

Run:

```powershell
npx vitest run src/features/review/reviewScheduler.test.ts --reporter=verbose
```

Expected: FAIL because `reviewScheduler.ts` does not exist.

- [x] **Step 2: Implement the lightweight review scheduler**

Expected: Again / Hard / Good / Easy update next due time, ease, interval, repetitions, lapses, and last review time predictably.

- [x] **Step 3: Run scheduler tests**

Expected: PASS.

### Task 2: Material Model Review State

**Files:**
- Modify: `src/features/materials/materialModel.ts`
- Modify: `src/features/materials/materialModel.test.ts`
- Modify: `src/features/materials/materialPersistence.ts`
- Modify: `src/features/materials/materialPersistence.test.ts`

- [x] **Step 1: Write failing tests for default schedules and review application**

Expected: initial and new materials expose review schedule fields, and review rating updates selected material.

- [x] **Step 2: Implement model integration and persistence normalization**

Expected: old persisted materials without schedule fields load with defaults instead of being discarded.

### Task 3: Review UI

**Files:**
- Create: `src/features/review/ReviewPanel.tsx`
- Modify: `src/features/materials/MaterialLibrary.tsx`
- Modify: `src/features/materials/MaterialInspector.tsx`
- Modify: `src/styles/global.css`

- [x] **Step 1: Add review view and navigation**

Expected: sidebar can switch between library and review.

- [x] **Step 2: Add focused review card and four rating controls**

Expected: review page shows due count, one material at a time, and rating buttons update state.

- [x] **Step 3: Add material-to-review jump**

Expected: inspector provides a way to begin reviewing the selected material.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Document phase-five review behavior**

- [x] **Step 2: Run automated verification**

Run:

```powershell
npx vitest run --reporter=verbose
npx tsc -b
npx vite build
```

Expected: PASS, allowing the existing chunk-size warning.

- [x] **Step 3: Browser smoke test**

Expected: open review view, rate a material, and confirm the due queue changes.
