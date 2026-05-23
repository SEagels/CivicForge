# CivicForge System Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining CivicForge desktop application shell with Dashboard, taxonomy browsing, import/export, settings/backup, and SQLite startup fallback wiring.

**Architecture:** Keep pure domain logic in focused modules with Vitest coverage, then compose the UI into the existing `MaterialLibrary` workspace. Tauri SQLite is attempted at startup through the repository layer; the current localStorage preview remains the browser fallback until native runtime validation is possible.

**Tech Stack:** Tauri, React, TypeScript, Vite, SQLite repository layer, Vitest, browser localStorage fallback.

---

### Task 1: Taxonomy And Dashboard Stats

**Files:**
- Create: `src/features/taxonomy/taxonomyStats.ts`
- Create: `src/features/taxonomy/taxonomyStats.test.ts`
- Create: `src/features/dashboard/DashboardPanel.tsx`

- [x] **Step 1: Write failing tests for topic/tag/type/review counts**

Run:

```powershell
npx vitest run src/features/taxonomy/taxonomyStats.test.ts --reporter=verbose
```

Expected: FAIL because `taxonomyStats.ts` does not exist.

- [x] **Step 2: Implement stats helpers**

Expected: helpers compute dashboard totals, topic counts, material type counts, tag counts, and due review count from material state.

- [x] **Step 3: Add Dashboard panel**

Expected: panel renders totals, recent materials, and quick action buttons.

### Task 2: Settings Persistence

**Files:**
- Create: `src/features/settings/appSettings.ts`
- Create: `src/features/settings/appSettings.test.ts`
- Create: `src/features/settings/SettingsPanel.tsx`

- [x] **Step 1: Write failing tests for versioned settings load/save**

Run:

```powershell
npx vitest run src/features/settings/appSettings.test.ts --reporter=verbose
```

Expected: FAIL because `appSettings.ts` does not exist.

- [x] **Step 2: Implement settings helpers**

Expected: settings persist theme mode and backup preference, malformed payloads fall back to defaults, and `applyThemeMode()` updates the document root dataset.

- [x] **Step 3: Add Settings/Backup panel**

Expected: panel supports theme mode, storage status, manual export, restore trigger, and reset sample data.

### Task 3: Import/Export Archive

**Files:**
- Create: `src/features/importExport/appArchive.ts`
- Create: `src/features/importExport/appArchive.test.ts`
- Create: `src/features/importExport/ImportExportPanel.tsx`

- [x] **Step 1: Write failing tests for export/restore archive validation**

Run:

```powershell
npx vitest run src/features/importExport/appArchive.test.ts --reporter=verbose
```

Expected: FAIL because `appArchive.ts` does not exist.

- [x] **Step 2: Implement archive helpers**

Expected: archive serializes material state, rewrite logs, and settings; restore rejects bad JSON or incompatible versions.

- [x] **Step 3: Add Import/Export panel**

Expected: panel can download JSON, accept JSON text/file input, and restore app state.

### Task 4: Tags/Themes UI And App Navigation

**Files:**
- Create: `src/features/taxonomy/TaxonomyPanel.tsx`
- Modify: `src/features/materials/MaterialLibrary.tsx`
- Modify: `src/styles/global.css`

- [x] **Step 1: Add full navigation state**

Expected: sidebar opens dashboard, library, review, rewrite, taxonomy, import/export, and settings.

- [x] **Step 2: Add taxonomy panel**

Expected: built-in topics, material type counts, question type coverage, and tags are visible.

- [x] **Step 3: Add archive/settings handlers to workspace**

Expected: export, restore, theme setting, backup setting, and reset actions operate on existing state.

### Task 5: SQLite Startup Wiring

**Files:**
- Modify: `src/features/materials/MaterialLibrary.tsx`
- Modify: `docs/database.md`

- [x] **Step 1: Attempt SQLite initialization at startup**

Expected: Tauri runtime loads `sqlite:civicforge.db`, initializes migrations/seeds, and reads material rows; browser preview remains on localStorage.

- [x] **Step 2: Surface storage mode in UI**

Expected: Dashboard/Settings shows `SQLite` when repository is active, otherwise `Preview localStorage`.

### Task 6: Final Verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Document completed system modules**

- [x] **Step 2: Run automated verification**

Run:

```powershell
npx vitest run --reporter=verbose
npx tsc -b --pretty false
npx vite build
```

Expected: PASS, allowing the existing Vite chunk-size warning.

- [x] **Step 3: Browser smoke test**

Expected: dashboard, taxonomy, import/export, settings, library, review, and rewrite routes are reachable; export JSON contains `CivicForge` archive data.
