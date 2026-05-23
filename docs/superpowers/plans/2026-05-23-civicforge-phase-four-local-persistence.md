# CivicForge Phase Four Local Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add refresh-safe local material persistence for development previews and prepare SQLite repository SQL assets for Tauri runtime integration.

**Architecture:** Use a pure storage adapter around `localStorage` for the current browser preview, with serialization guards so bad stored data falls back safely. Keep SQLite SQL assets separate and tested, ready to be wired into the Tauri SQL plugin when native runtime setup is available.

**Tech Stack:** React, TypeScript, Vitest, browser localStorage, SQLite SQL assets.

---

### Task 1: Material Persistence Model

**Files:**
- Create: `src/features/materials/materialPersistence.ts`
- Create: `src/features/materials/materialPersistence.test.ts`

- [x] **Step 1: Write failing tests for save/load/clear and bad data fallback**

Run:

```powershell
npm test -- src/features/materials/materialPersistence.test.ts --run
```

Expected: FAIL because `materialPersistence.ts` does not exist.

- [x] **Step 2: Implement local material storage helpers**

Expected: helpers serialize a versioned payload, load valid state, return `null` for incompatible or malformed state, and clear storage.

- [x] **Step 3: Run persistence tests**

Run:

```powershell
npm test -- src/features/materials/materialPersistence.test.ts --run
```

Expected: PASS.

### Task 2: UI Persistence Integration

**Files:**
- Modify: `src/features/materials/MaterialLibrary.tsx`
- Modify: `src/features/materials/MaterialInspector.tsx`
- Modify: `src/styles/global.css`

- [x] **Step 1: Load stored material state on initialization**

Expected: existing saved materials appear after a page refresh.

- [x] **Step 2: Save material state whenever it changes**

Expected: title/body/metadata edits are persisted to browser localStorage.

- [x] **Step 3: Add reset example data action**

Expected: user can recover bundled sample materials from the inspector.

### Task 3: SQLite Repository SQL Assets

**Files:**
- Create: `src/lib/db/materialRepositorySql.ts`
- Create: `src/lib/db/materialRepositorySql.test.ts`
- Modify: `docs/database.md`

- [x] **Step 1: Write failing SQL asset tests**

Run:

```powershell
npm test -- src/lib/db/materialRepositorySql.test.ts --run
```

Expected: FAIL because SQL asset module does not exist.

- [x] **Step 2: Implement tested SQL constants**

Expected: SQL constants cover list active materials, upsert material, archive material, replace tags, and replace question types.

- [x] **Step 3: Run SQL asset tests**

Run:

```powershell
npm test -- src/lib/db/materialRepositorySql.test.ts --run
```

Expected: PASS.

### Task 4: Verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Document localStorage phase-four behavior**

Expected: README explains preview persistence and future SQLite wiring.

- [x] **Step 2: Run automated verification**

Run:

```powershell
npm test -- --run
npm run typecheck
npm run build
```

Expected: PASS, allowing the existing Milkdown bundle-size warning.

- [x] **Step 3: Browser smoke test**

Expected: Create or edit a material, reload the page, and confirm the edited content remains.
