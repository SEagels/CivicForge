# CivicForge / 公考申论素材锻造台

CivicForge is a local-first desktop app for civil-service essay preparation. It helps you collect essay materials, refine standard expressions, review them with a lightweight Anki-style schedule, and write in a Typora-like Markdown editor.

CivicForge 是一个本地优先的公务员申论备考桌面应用，专注于整理申论素材、沉淀规范表达、进行轻量 Anki 式复习，并提供接近 Typora 的 Markdown 写作体验。

## Positioning / 产品定位

- Local-first, single-user, desktop-oriented.
- Built for essay material management, not question practice.
- Data is local by default: SQLite in Tauri, localStorage in browser preview.
- No account system, cloud sync, collaboration, question bank, wrong-answer system, graph view, or plugin marketplace.

- 本地优先、单人使用、桌面端体验优先。
- 专门服务申论素材沉淀，不做刷题、错题或题库。
- 数据默认保存在本地：Tauri 中使用 SQLite，浏览器预览中使用 localStorage。
- 不做账号、云同步、多人协作、题库、错题系统、图谱视图和插件市场。

## Tech Stack / 技术栈

- Tauri
- React
- TypeScript
- Vite
- SQLite with FTS5
- Milkdown Markdown editor
- Vitest

## Prerequisites / 环境要求

- Node.js 22+ or 24+
- npm 11+
- Rust and Cargo for native Tauri development/build
- Microsoft Edge WebView2 Runtime on Windows

当前机器可以运行 Node/npm 层面的测试和构建。若要执行 `npm run tauri dev` 或 `npm run tauri build`，请先安装 Rust/Cargo，并确认 `rustc -V` 与 `cargo -V` 可以正常输出版本。

## Install / 安装

```powershell
cd D:\Projects\CivicForge
npm install
```

建议把项目放在全英文路径下，例如 `D:\Projects\CivicForge`，可以减少 Windows 上 Node/Rust 工具链遇到中文路径时的编码或构建问题。

## Development / 开发启动

Frontend preview:

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

Native Tauri build requires Rust/Cargo.

Current machine note: `rustc -V` and `cargo -V` are not available in `PATH`, so `npx tauri build` currently stops at `cargo metadata`. Install Rust from [rustup.rs](https://rustup.rs/) or your preferred Windows toolchain setup before native packaging.

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
    domain/              Built-in essay taxonomy and shared domain types
    features/
      dashboard/         Study dashboard and quick actions
      editor/            Milkdown Markdown editing surface
      importExport/      JSON archive export and restore helpers/UI
      materials/         Material library, filters, repository, persistence
      review/            Lightweight Anki-style scheduler and UI
      rewrite/           Template-based rewrite workshop and history
      settings/          Local settings, theme mode, backup preferences
      taxonomy/          Topic/type/question/tag statistics and UI
    lib/db/              SQLite schema, migrations, Tauri SQL client
    styles/              Global desktop styles
  src-tauri/             Tauri native shell, permissions, plugin config
  docs/                  Database, backup, and Superpowers plans
  README.md              Bilingual project guide
```

## Database / 数据库说明

The local SQLite database is configured as `sqlite:civicforge.db` through the Tauri SQL plugin. On Tauri startup, the app attempts to:

1. Load the SQLite database.
2. Run schema migrations.
3. Seed built-in topics and question types.
4. Read active/draft materials, Rewrite history, and app settings through repository layers.
5. Save future materials, Rewrite history, and settings back to SQLite.
6. Fall back to browser `localStorage` when Tauri runtime is unavailable.

本地 SQLite 数据库通过 Tauri SQL 插件配置为 `sqlite:civicforge.db`。在 Tauri runtime 中启动时，应用会尝试加载数据库、执行迁移、写入内置主题与题型，并通过 repository 读写素材、Rewrite 历史和应用设置。普通 `npm run dev` 浏览器预览没有 Tauri runtime，因此会回退到 localStorage。

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

The current app supports portable JSON archive export and restore from the Import/Export page. In Tauri runtime, export/restore uses official dialog and filesystem plugins; browser preview keeps Blob download, file input, and paste fallback. The archive contains:

- Material state
- Rewrite history
- App settings
- Archive version and export timestamp

当前应用已支持在导入导出页生成和恢复 JSON 备份。Tauri runtime 中优先使用官方 dialog/fs 插件；浏览器预览保留下载、文件输入和粘贴回退。备份内容包含素材状态、Rewrite 历史、应用设置、归档版本号和导出时间。SQLite 文件级备份仍保留为后续增强项。

See [docs/backup-restore.md](docs/backup-restore.md) for the longer backup strategy.

## Current Modules / 当前模块

Completed:

- Dashboard: local study summary, review count, quick entry points.
- Library: material list, filters, metadata inspector, Markdown editor.
- Editor: Milkdown CommonMark editor with Markdown source fallback.
- Review: Again / Hard / Good / Easy scheduler, due queue, today count.
- Rewrite: template-based rewrite workshop, prompt generation, history, save as material.
- Tags/Themes: built-in topic, material type, question type, and tag statistics.
- Import/Export: JSON archive preview, download, paste/file restore.
- Settings/Backup: theme mode, backup preference, storage status, sample reset.
- SQLite layer: migrations, seed data, repository mapping, startup wiring with fallback.
- Desktop data closure: SQLite persistence for materials, Rewrite logs, and settings; Tauri-native archive save/open.

已完成：

- Dashboard：学习概览、复习数量、快速入口。
- 素材库：素材列表、搜索筛选、属性面板、Markdown 编辑。
- 编辑器：Milkdown CommonMark 编辑器和 Markdown 源码兜底。
- 复习：Again / Hard / Good / Easy、到期队列、今日待复习数量。
- Rewrite：模板化改写工坊、提示词生成、历史保存、结果保存为素材。
- 主题标签：内置主题、素材类型、适用题型和标签统计。
- 导入导出：JSON 备份预览、下载、粘贴/文件恢复。
- 设置备份：主题模式、备份偏好、存储状态、示例数据重置。
- SQLite 层：迁移、内置数据 seed、仓储映射、启动接入和预览回退。
- 桌面数据闭环：素材、Rewrite 历史和设置落到 SQLite，导入导出优先走 Tauri 本地文件能力。
