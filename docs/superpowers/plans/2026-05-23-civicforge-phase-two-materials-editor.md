# CivicForge Phase Two Materials Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable phase-two material library and Markdown editor shell for local civil service essay preparation.

**Architecture:** Keep persistence mocked in memory for this phase, but shape the UI around the future repository boundary. Put material state transitions in pure TypeScript modules with tests, then compose React feature components for the desktop three-column layout.

**Tech Stack:** React, TypeScript, Vite, Vitest, Milkdown, local in-memory state.

---

### Task 1: Editor Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install Milkdown packages**

Run:

```powershell
npm install @milkdown/core @milkdown/react @milkdown/preset-commonmark @milkdown/theme-nord
```

Expected: packages install without changing the app architecture.

### Task 2: Material State Model

**Files:**
- Create: `src/features/materials/materialModel.ts`
- Create: `src/features/materials/materialModel.test.ts`

- [ ] **Step 1: Write failing tests for create/update/archive/select behavior**

Run:

```powershell
npm test -- src/features/materials/materialModel.test.ts --run
```

Expected: FAIL because `materialModel.ts` does not exist.

- [ ] **Step 2: Implement material state reducer and sample seed**

Expected: pure functions support creating a material, selecting a material, updating title/content/properties, and archiving.

- [ ] **Step 3: Run model tests**

Run:

```powershell
npm test -- src/features/materials/materialModel.test.ts --run
```

Expected: PASS.

### Task 3: Material UI Components

**Files:**
- Create: `src/features/materials/MaterialLibrary.tsx`
- Create: `src/features/materials/MaterialList.tsx`
- Create: `src/features/materials/MaterialInspector.tsx`
- Create: `src/features/editor/MarkdownEditor.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Compose the three-column desktop layout**

Expected: navigation, material list, editor workspace, and inspector render from the material model.

- [ ] **Step 2: Wire UI actions to reducer**

Expected: user can create, select, edit, change metadata, toggle review, and archive materials in memory.

- [ ] **Step 3: Use Milkdown editor with textarea fallback**

Expected: Milkdown is attempted first; fallback remains available if runtime integration needs later refinement.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document phase-two status and development workflow**

Expected: README describes in-memory phase-two behavior and Rust requirement for native builds.

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm test -- --run
npm run typecheck
npm run build
```

Expected: all Node-layer checks pass.
