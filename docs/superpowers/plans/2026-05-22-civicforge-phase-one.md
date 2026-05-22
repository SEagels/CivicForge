# CivicForge Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial CivicForge desktop app scaffold with Git, bilingual documentation, domain seeds, SQLite schema, and testable database migration assets.

**Architecture:** Use a Tauri + Vite + React + TypeScript shell, with database schema assets kept in focused TypeScript modules so they can be tested before being wired into the Tauri runtime. The first phase deliberately stops at infrastructure and local data foundations.

**Tech Stack:** Tauri, React, TypeScript, Vite, SQLite FTS5, Vitest, Git.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/app/App.tsx`
- Create: `src/main.tsx`
- Create: `src/styles/global.css`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/main.rs`

- [ ] **Step 1: Generate or create the Vite React TypeScript scaffold**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' create vite@latest . -- --template react-ts
```

Expected: React TypeScript files are created in the repository root.

- [ ] **Step 2: Add Tauri package scripts and dependencies**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' install
& 'D:\软件\nodejs\npm.cmd' install @tauri-apps/api @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-sql
& 'D:\软件\nodejs\npm.cmd' install -D @tauri-apps/cli vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `node_modules` and `package-lock.json` exist.

- [ ] **Step 3: Create minimal Tauri Rust shell**

Expected: `src-tauri` contains a valid Tauri v2 app skeleton. Full native build requires Rust/Cargo in PATH.

### Task 2: Domain Model Seeds

**Files:**
- Create: `src/domain/enums.ts`
- Create: `src/domain/seeds.ts`
- Create: `src/domain/types.ts`
- Test: `src/domain/seeds.test.ts`

- [ ] **Step 1: Write failing seed tests**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' test -- src/domain/seeds.test.ts --run
```

Expected: FAIL because seed exports do not exist yet.

- [ ] **Step 2: Implement theme, material type, and question type seeds**

Expected: The built-in public exam essay categories are exported as typed readonly arrays.

- [ ] **Step 3: Verify tests pass**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' test -- src/domain/seeds.test.ts --run
```

Expected: PASS.

### Task 3: SQLite Schema Assets

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/migrations.ts`
- Test: `src/lib/db/schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' test -- src/lib/db/schema.test.ts --run
```

Expected: FAIL because schema exports do not exist yet.

- [ ] **Step 2: Implement migration SQL**

Expected: Migration SQL creates `materials`, `review_logs`, `rewrite_logs`, `topics`, `tags`, `material_tags`, `question_types`, `material_question_types`, `settings`, `schema_migrations`, and `materials_fts`.

- [ ] **Step 3: Verify tests pass**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' test -- src/lib/db/schema.test.ts --run
```

Expected: PASS.

### Task 4: Documentation

**Files:**
- Create or modify: `README.md`
- Create: `docs/database.md`
- Create: `docs/backup-restore.md`

- [ ] **Step 1: Add bilingual README**

Expected: README includes Chinese and English sections for overview, install, development, build, directory structure, database, backup, and recovery.

- [ ] **Step 2: Add database and backup docs**

Expected: Docs explain schema purpose, migration strategy, backup files, and restore safety.

### Task 5: Verification

**Files:**
- Modify if needed: files touched above.

- [ ] **Step 1: Run tests**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' test -- --run
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
& 'D:\软件\nodejs\npm.cmd' run build
```

Expected: PASS for the web bundle. Native `tauri build` is blocked until Rust/Cargo is installed.
