# CivicForge Desktop Data Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CivicForge desktop runtime persist materials, rewrite logs, and settings through SQLite, while keeping browser preview fallback and adding Tauri-native archive file operations.

**Architecture:** Add small repository modules for each SQLite-backed domain, then compose them with a focused app data service that chooses SQLite when Tauri is available and localStorage otherwise. Keep React state in `MaterialLibrary`, but move persistence decisions out of the component. Archive import/export uses a Tauri dialog/fs adapter with browser Blob/FileReader fallback.

**Tech Stack:** Tauri 2, React, TypeScript, SQLite, Tauri SQL plugin, Tauri dialog/fs plugins, Vitest, Vite.

---

### Task 1: Rewrite Log SQLite Repository

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/migrations.ts`
- Create: `src/lib/db/rewriteLogRepositorySql.ts`
- Create: `src/lib/db/rewriteLogRepositorySql.test.ts`
- Create: `src/features/rewrite/rewriteLogRepository.ts`
- Create: `src/features/rewrite/rewriteLogRepository.test.ts`

- [x] **Step 1: Write failing SQL asset tests**

Create tests that expect SQL constants for listing, upserting, deleting, and clearing rewrite logs. The tests should fail because `rewriteLogRepositorySql.ts` does not exist.

Run:

```powershell
npx vitest run src/lib/db/rewriteLogRepositorySql.test.ts --reporter=verbose
```

Expected: FAIL with module-not-found.

- [x] **Step 2: Add rewrite log UUID migration and SQL constants**

Add `uuid` to `rewrite_logs` in `INITIAL_SCHEMA_SQL` and add migration version `2`:

```sql
ALTER TABLE rewrite_logs ADD COLUMN uuid TEXT NOT NULL DEFAULT '';
UPDATE rewrite_logs SET uuid = 'rewrite-db-' || id WHERE uuid = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_rewrite_logs_uuid ON rewrite_logs(uuid);
```

Create SQL constants:

- `listRewriteLogs`
- `upsertRewriteLog`
- `deleteRewriteLog`
- `clearRewriteLogs`

Run the SQL asset tests again.

- [x] **Step 3: Write failing repository tests**

Test that SQLite rows map into `RewriteLog`, that upsert params preserve `log.id`, and that list/save/delete/clear execute the expected SQL.

Run:

```powershell
npx vitest run src/features/rewrite/rewriteLogRepository.test.ts --reporter=verbose
```

Expected: FAIL with module-not-found.

- [x] **Step 4: Implement repository**

Create `createRewriteLogRepository(db)` with:

- `listRewriteLogs(): Promise<readonly RewriteLog[]>`
- `saveRewriteLog(log: RewriteLog): Promise<void>`
- `deleteRewriteLog(logId: string): Promise<void>`
- `replaceRewriteLogs(logs: readonly RewriteLog[]): Promise<void>`

Run:

```powershell
npx vitest run src/lib/db/rewriteLogRepositorySql.test.ts src/features/rewrite/rewriteLogRepository.test.ts --reporter=verbose
```

Expected: PASS.

### Task 2: Settings SQLite Repository

**Files:**
- Create: `src/lib/db/settingsRepositorySql.ts`
- Create: `src/lib/db/settingsRepositorySql.test.ts`
- Create: `src/features/settings/settingsRepository.ts`
- Create: `src/features/settings/settingsRepository.test.ts`

- [x] **Step 1: Write failing SQL asset tests**

Test SQL constants for selecting a setting by key, upserting a setting, deleting a setting, and clearing app settings.

Run:

```powershell
npx vitest run src/lib/db/settingsRepositorySql.test.ts --reporter=verbose
```

Expected: FAIL with module-not-found.

- [x] **Step 2: Implement SQL constants**

Create:

- `selectSetting`
- `upsertSetting`
- `deleteSetting`
- `clearSettings`

Run the SQL asset tests again.

- [x] **Step 3: Write failing repository tests**

Test that missing settings return `DEFAULT_APP_SETTINGS`, valid JSON loads, malformed JSON falls back to defaults, and saving writes JSON under key `app.settings`.

Run:

```powershell
npx vitest run src/features/settings/settingsRepository.test.ts --reporter=verbose
```

Expected: FAIL with module-not-found.

- [x] **Step 4: Implement repository**

Create `createSettingsRepository(db)` with:

- `loadSettings(): Promise<AppSettings>`
- `saveSettings(settings: AppSettings): Promise<void>`
- `clearSettings(): Promise<void>`

Run:

```powershell
npx vitest run src/lib/db/settingsRepositorySql.test.ts src/features/settings/settingsRepository.test.ts --reporter=verbose
```

Expected: PASS.

### Task 3: App Data Service

**Files:**
- Create: `src/features/appData/appDataService.ts`
- Create: `src/features/appData/appDataService.test.ts`

- [x] **Step 1: Write failing service tests**

Test two modes:

1. Browser fallback loads/saves materials, rewrite logs, and settings via localStorage adapters.
2. SQLite mode initializes DB, seeds starter materials when empty, loads SQLite rewrite logs/settings, and saves future updates through repositories.

Run:

```powershell
npx vitest run src/features/appData/appDataService.test.ts --reporter=verbose
```

Expected: FAIL with module-not-found.

- [x] **Step 2: Implement service**

Create:

- `StorageMode = "SQLite" | "Preview localStorage"`
- `AppDataSnapshot`
- `AppDataService`
- `createAppDataService(options)`

The service should expose:

- `load(): Promise<AppDataSnapshot>`
- `saveMaterials(state: MaterialState): Promise<void>`
- `saveRewriteLogs(logs: readonly RewriteLog[]): Promise<void>`
- `saveSettings(settings: AppSettings): Promise<void>`
- `restore(snapshot: Omit<AppDataSnapshot, "storageMode">): Promise<void>`

Run the service tests.

### Task 4: Wire UI To App Data Service

**Files:**
- Modify: `src/features/materials/MaterialLibrary.tsx`

- [x] **Step 1: Replace scattered repository/localStorage effects**

Use `createAppDataService()` once in `MaterialLibrary`. Load initial snapshot on mount, then call service save methods when state, rewrite logs, or settings change after initial hydration.

- [x] **Step 2: Preserve current UI behavior**

Keep the seven-page navigation, archive preview, theme application, and reset sample data behavior intact.

- [x] **Step 3: Run typecheck and targeted tests**

Run:

```powershell
npx vitest run src/features/appData/appDataService.test.ts src/features/materials/materialRepository.test.ts src/features/rewrite/rewriteLogRepository.test.ts src/features/settings/settingsRepository.test.ts --reporter=verbose
npx tsc -b --pretty false
```

Expected: PASS.

### Task 5: Tauri Archive File Adapter

**Files:**
- Create: `src/features/importExport/archiveFileAdapter.ts`
- Create: `src/features/importExport/archiveFileAdapter.test.ts`
- Modify: `src/features/importExport/ImportExportPanel.tsx`
- Modify: `src/features/materials/MaterialLibrary.tsx`

- [x] **Step 1: Write failing adapter tests**

Test that Tauri mode calls save/open dialog and fs read/write dependencies, cancellation is handled, and browser fallback uses the injected browser download function.

Run:

```powershell
npx vitest run src/features/importExport/archiveFileAdapter.test.ts --reporter=verbose
```

Expected: FAIL with module-not-found.

- [x] **Step 2: Implement adapter**

Create:

- `saveArchiveFile(archiveJson, filename, deps?)`
- `readArchiveFile(deps?)`
- `downloadArchiveInBrowser(archiveJson, filename)`

Use dynamic imports for `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs` only when Tauri runtime is available.

- [x] **Step 3: Wire Import/Export UI**

Use `saveArchiveFile()` for export. Add a button for Tauri-native file restore that calls `readArchiveFile()` and passes the text into existing restore logic. Keep paste/file-input fallback.

Run:

```powershell
npx vitest run src/features/importExport/archiveFileAdapter.test.ts src/features/importExport/appArchive.test.ts --reporter=verbose
npx tsc -b --pretty false
```

Expected: PASS.

### Task 6: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/database.md`
- Modify: `docs/backup-restore.md`
- Modify: `docs/superpowers/plans/2026-05-23-civicforge-desktop-data-closure.md`

- [x] **Step 1: Update docs**

Document SQLite-backed materials/rewrite/settings, browser fallback, Tauri archive import/export, Rust/Cargo requirement, and exact verification commands.

- [x] **Step 2: Run full verification**

Run:

```powershell
npx vitest run --reporter=verbose
npx tsc -b --pretty false
npx vite build
rustc -V
cargo -V
npm run tauri build
```

Expected:

- Vitest, TypeScript, and Vite build pass.
- If Rust/Cargo are unavailable, document the exact blocker and do not claim native build success.
- If Rust/Cargo are available, `npm run tauri build` should complete or produce an actionable error.

- [x] **Step 3: Browser smoke test**

Open `http://127.0.0.1:1420`, verify Dashboard, Library, Review, Rewrite, Tags/Themes, Import/Export, and Settings are reachable. Verify archive preview contains `CivicForge`, `materialsState`, `rewriteLogs`, and `settings`.

- [x] **Step 4: Commit**

Commit all stage-nine work:

```powershell
git add README.md docs src src-tauri
git commit -m "feat: complete desktop data persistence"
```
