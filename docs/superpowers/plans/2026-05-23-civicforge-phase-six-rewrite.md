# CivicForge Phase Six Rewrite Workshop Implementation Plan

**Goal:** Add the first template-based Rewrite workshop without external model dependencies. It must support pasted or imported source text, rewrite target selection, prompt template generation, manual result editing, history saving, and saving a result as a new material.

**Architecture:** Keep rewrite target metadata and prompt generation in a pure TypeScript module. Store rewrite history in a separate versioned `localStorage` payload for the frontend preview, mirroring the future `rewrite_logs` SQLite table boundary. Let the material model expose a focused helper for creating a new material from rewrite output.

**Tech Stack:** React, TypeScript, Vitest, existing material state persistence, browser localStorage.

---

### Task 1: Rewrite Domain Logic

**Files:**
- Create: `src/features/rewrite/rewriteWorkshop.ts`
- Create: `src/features/rewrite/rewriteWorkshop.test.ts`

- [x] **Step 1: Write failing tests for target options, prompt generation, logs, and material mapping**

Run:

```powershell
npx vitest run src/features/rewrite/rewriteWorkshop.test.ts --reporter=verbose
```

Expected: FAIL because `rewriteWorkshop.ts` does not exist.

- [x] **Step 2: Implement rewrite domain helpers**

Expected: target options cover all required rewrite goals, prompt templates include target instructions and original text, history records are timestamped, and target-to-material-type mapping is explicit.

### Task 2: Rewrite History Persistence

**Files:**
- Create: `src/features/rewrite/rewritePersistence.ts`
- Create: `src/features/rewrite/rewritePersistence.test.ts`

- [x] **Step 1: Write failing tests for save/load/clear and malformed payload fallback**

Expected: FAIL before implementation.

- [x] **Step 2: Implement versioned localStorage helpers**

Expected: valid history loads, bad payload returns an empty list, and clear removes the key.

### Task 3: Material And UI Integration

**Files:**
- Modify: `src/features/materials/materialModel.ts`
- Modify: `src/features/materials/materialModel.test.ts`
- Create: `src/features/rewrite/RewritePanel.tsx`
- Modify: `src/features/materials/MaterialLibrary.tsx`
- Modify: `src/styles/global.css`

- [x] **Step 1: Add material creation from rewrite output**

Expected: a rewrite result creates an active selected material with mapped type and source metadata.

- [x] **Step 2: Add Rewrite navigation and panel**

Expected: sidebar opens Rewrite, source text can be pasted or imported from a material, target changes update the generated prompt, result can be edited and saved.

- [x] **Step 3: Save history and save result as material**

Expected: history list updates and “save as material” returns to the library with the new material selected.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Document phase-six Rewrite behavior**

- [x] **Step 2: Run automated verification**

Run:

```powershell
npx vitest run --reporter=verbose
npx tsc -b --pretty false
npx vite build
```

Expected: PASS, allowing the existing chunk-size warning.

- [x] **Step 3: Browser smoke test**

Expected: open Rewrite, import a material, save a result to history, save it as a material, and see it in the library.
