# CivicForge Phase Seven SQLite/Tauri Data Layer Implementation Plan

**Goal:** Prepare the real local SQLite data layer for Tauri runtime integration while preserving the current browser-preview fallback.

**Architecture:** Add a small database client around `@tauri-apps/plugin-sql`, a migration/seed initializer, and a material repository that maps between SQLite rows and `MaterialDraft`. Keep React UI on the existing localStorage-backed preview state in this phase; the next phase can switch `MaterialLibrary` to the repository once native runtime smoke testing is available.

**Tech Stack:** Tauri SQL plugin, SQLite, React, TypeScript, Vitest.

---

### Task 1: Database Client

**Files:**
- Create: `src/lib/db/databaseClient.ts`
- Create: `src/lib/db/databaseClient.test.ts`

- [x] **Step 1: Write failing tests for runtime detection and DB loading**

Expected: FAIL because `databaseClient.ts` does not exist.

- [x] **Step 2: Implement lazy Tauri SQL database loading**

Expected: browser preview returns `null`; Tauri runtime loads `sqlite:civicforge.db`.

### Task 2: Migration And Seed Initialization

**Files:**
- Create: `src/lib/db/databaseInitializer.ts`
- Create: `src/lib/db/databaseInitializer.test.ts`

- [x] **Step 1: Write failing tests for SQL batch splitting, migrations, and seeds**

Expected: FAIL because `databaseInitializer.ts` does not exist.

- [x] **Step 2: Implement initializer**

Expected: migrations are applied in order, schema migrations are recorded, and built-in topics/question types are upserted.

### Task 3: Material Repository

**Files:**
- Create: `src/features/materials/materialRepository.ts`
- Create: `src/features/materials/materialRepository.test.ts`
- Modify: `src/lib/db/materialRepositorySql.ts`
- Modify: `src/lib/db/materialRepositorySql.test.ts`

- [x] **Step 1: Update SQL asset tests for positional Tauri SQL params**

Expected: FAIL until SQL constants use `$1`, `$2`, etc.

- [x] **Step 2: Implement material repository mapping and calls**

Expected: row-to-model, model-to-bind params, list/search/save/archive calls are covered.

### Task 4: Tauri Config And Documentation

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `README.md`
- Modify: `docs/database.md`

- [x] **Step 1: Add SQL preload config and documentation**

- [x] **Step 2: Run automated verification**

Run:

```powershell
npx vitest run --reporter=verbose
npx tsc -b --pretty false
npx vite build
```

Expected: PASS, allowing the existing chunk-size warning.

- [x] **Step 3: Check native build availability**

Run:

```powershell
rustc -V
cargo -V
```

Expected: If Rust/Cargo are missing, record that native Tauri build is environment-blocked.
