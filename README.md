# CivicForge / 公考申论素材锻造台

CivicForge is a local-first desktop app for civil service essay preparation. It focuses on collecting essay materials, refining standard expressions, reviewing them with a lightweight Anki-style schedule, and writing in a Typora-like Markdown editor.

CivicForge 是一个本地优先的公务员申论备考桌面应用，专注于素材沉淀、规范表达整理、轻量 Anki 式复习，以及接近 Typora 的 Markdown 写作体验。

## Positioning / 产品定位

- Local-first and single-user by default.
- Built for civil service essay preparation, not question practice.
- Data is stored locally in SQLite.
- No account system, cloud sync, collaboration, question bank, wrong-answer system, graph view, or plugin marketplace.

- 默认本地优先、单人使用。
- 专门服务申论备考，不做刷题系统。
- 数据默认保存在本地 SQLite 数据库。
- 不做账号、云同步、多人协作、题库、错题、图谱视图、插件市场。

## Tech Stack / 技术栈

- Tauri
- React
- TypeScript
- Vite
- SQLite with FTS5
- Milkdown for the Markdown editor

## Prerequisites / 环境要求

- Node.js 22+ or 24+
- npm 11+
- Rust and Cargo for native Tauri build
- Microsoft Edge WebView2 Runtime on Windows

当前机器已能运行 Node/npm 层验证；如果要执行 `npm run tauri build`，还需要先安装 Rust/Cargo 并确保它们在 `PATH` 中。

## Install / 安装依赖

```powershell
cd D:\Projects\CivicForge
& 'D:\软件\nodejs\npm.cmd' install
```

If your Node/npm is already in `PATH`, this also works:

```powershell
npm install
```

建议把项目放在全英文路径下，例如 `D:\Projects\CivicForge`。中文路径可能导致 npm 或 Rust 工具链在 Windows 上出现解包或构建问题。

## Development / 开发启动

Frontend only:

```powershell
npm run dev
```

Tauri desktop app:

```powershell
npm run tauri dev
```

## Build / 构建

Web bundle:

```powershell
npm run build
```

Windows desktop package:

```powershell
npm run tauri build
```

Native Tauri build requires Rust/Cargo. If `rustc -V` or `cargo -V` fails, install Rust first.

## Test / 测试

```powershell
npm test -- --run
npm run typecheck
npm run build
```

## Directory Structure / 目录结构

```text
CivicForge/
  src/
    app/                 React app shell
    domain/              Essay taxonomy, review enums, shared domain types
    features/
      editor/            Milkdown Markdown editing surface
      materials/         Material library, filters, persistence helpers
      review/            Lightweight Anki-style review scheduler and UI
      rewrite/           Template-based rewrite workshop and history helpers
    lib/db/              SQLite schema and migration assets
    styles/              Global styles
  src-tauri/             Tauri native shell and permissions
  docs/                  Database, backup, and implementation notes
  README.md              Bilingual project guide
```

后续阶段会继续扩展 `import-export`、`settings` 等功能目录。

## Database / 数据库说明

The local SQLite database will be created in the app data directory during the runtime integration phase. Phase one defines the initial schema and migrations, and phase four adds tested material repository SQL assets.

一期已经定义 SQLite 初始 schema 与迁移资产，第四阶段补充了素材仓储 SQL 资产。运行期接入后，数据库会放在应用数据目录中。

During the current frontend preview, material edits are persisted in browser `localStorage` so refresh testing is safe before the native SQLite runtime is wired.

当前前端预览阶段会把素材编辑结果暂存在浏览器 `localStorage`，这样在接入原生 SQLite 运行期之前，也可以安全验证刷新后恢复。

Core tables:

- `materials`
- `review_logs`
- `rewrite_logs`
- `topics`
- `tags`
- `material_tags`
- `question_types`
- `material_question_types`
- `settings`
- `materials_fts`
- `schema_migrations`

See [docs/database.md](docs/database.md) for details.

## Backup And Restore / 备份与恢复

Planned backup strategy:

- Manual backup creates a full SQLite database copy.
- Automatic backup can run once per day on first launch.
- Restore validates the database before replacing the active file.
- JSON export is used for portable data migration.
- Markdown export is used for writing-friendly archives.

计划中的备份策略：

- 手动备份生成完整 SQLite 数据库副本。
- 自动备份可在每日首次启动时执行。
- 恢复前先校验数据库结构，再替换当前数据库。
- JSON 导出用于完整迁移。
- Markdown 导出用于写作友好的长期归档。

See [docs/backup-restore.md](docs/backup-restore.md) for details.

## Current Phase / 当前阶段

Completed phase-one foundation:

- Git repository initialized.
- Tauri + React + TypeScript + Vite scaffold added.
- Built-in essay taxonomy added.
- SQLite schema and migration assets added.
- Vitest coverage added for taxonomy and schema.
- Bilingual documentation added.

Completed phase-two slice:

- In-memory material library shell.
- Three-column desktop study layout.
- Material creation, selection, editing, metadata updates, review toggle, and archive action.
- Milkdown CommonMark editor integration with a Markdown source fallback.

Completed phase-three slice:

- In-memory keyword search across title, body, excerpt, source, tags, and taxonomy names.
- Topic, material type, question type, tag, favorite-only, and review-enabled filters.
- Filter result counts, clear-filter action, and empty-state guidance.
- Inspector statistics for word count, tag count, status, review state, and favorite toggle.

Completed phase-four slice:

- Refresh-safe browser preview persistence for material state.
- Reset action for restoring the built-in sample materials.
- Tested SQLite material repository SQL assets for list, search, upsert, archive, tags, and question types.

Completed phase-five slice:

- Lightweight review scheduler with Again / Hard / Good / Easy ratings.
- Due queue and today review count.
- Review state stored on material drafts with compatibility for older preview data.
- Focused review page and selected-material jump from the inspector.

Completed phase-six slice:

- Template-based Rewrite workshop with pasted or imported source text.
- Built-in rewrite targets for compressed expressions, argument paragraphs, openings, endings, transitions, title sentences, and free rewriting.
- Prompt template generation for external model use or manual editing.
- Rewrite history persistence and saving results as new materials.

阶段一已完成工程基础与数据库落地。阶段二已先使用内存状态跑通素材库和编辑器主流程。阶段三已实现内存搜索与筛选。阶段四让前端预览具备刷新后恢复能力，并准备好后续接入 Tauri SQLite 的素材仓储 SQL。阶段五已完成轻量 Anki 式复习一期。阶段六已完成模板化 Rewrite 工坊一期，包括导入原文、生成提示模板、保存历史和保存为新素材。
