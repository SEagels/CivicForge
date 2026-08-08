# CivicForge / 公考申论锻造台

CivicForge is a local-first Windows desktop workspace for civil-service essay study. Version 2.0 connects daily planning, writing practice, source collection, knowledge cards, active recall, and progress review in one local learning loop.

CivicForge 是一款本地优先的 Windows 申论学习工作台。2.0 将今日计划、申论训练、资料整理、知识卡片、主动回忆和进度复盘连接成完整学习闭环。

## Product Scope / 产品范围

- Local-first, single-user, Windows desktop application.
- Five primary workspaces: Today, Practice, Library, Review, and Progress.
- SQLite is the source of truth in Tauri; browser preview uses `localStorage` only for development.
- No account system, cloud sync, collaboration, question bank, wrong-answer system, or plugin marketplace.
- Rewrite, graph, taxonomy, answer workbench, import/export, and settings remain available as Legacy tools while 2.0 workflows mature.

- 本地优先、单人使用、面向 Windows 桌面端。
- 五个一级工作区：今天、训练、素材、复习、进度。
- Tauri 桌面端以 SQLite 为唯一真实数据源；浏览器预览仅在开发时使用 `localStorage`。
- 不做账号、云同步、多人协作、题库、错题系统和插件市场。
- Rewrite、知识图谱、主题标签、调用工作台、导入导出和设置暂作为 Legacy 工具保留，避免重构期间丢失能力。

## Current 2.0 Foundation / 当前 2.0 基础能力

- **Today / 今天**: 15、30、60 分钟学习计划，任务恢复和快速记录。
- **Practice / 训练**: 资料阅读、提纲、作答、复盘修改四阶段训练，可插入已验证知识卡并记录真实调用。
- **Library / 素材**: 资料收件箱、五项质量检查、可追溯知识卡片和旧版成品素材。
- **Review / 复习**: 主动回忆，显示答案后使用 Again / Hard / Good / Easy 评分。
- **Progress / 进度**: 训练、知识卡、复习与弱项概览。
- **Windows widget / 桌面小组件**: 今日任务、每日一卡、快速记录、隐私和紧凑模式。
- **Data safety / 数据安全**: 事务迁移、失败回滚、archive v1/v2 兼容和 archive v3 导出恢复。

## Tech Stack / 技术栈

- Tauri 2 + Rust
- React 19 + TypeScript + Vite
- SQLite + FTS5
- Milkdown Markdown editor
- Vitest

## Prerequisites / 环境要求

- Node.js 22+ and npm 11+
- Rust stable and Cargo
- Microsoft Edge WebView2 Runtime
- Windows 10/11 for native build and widget testing

确认以下命令可以正常输出版本：

```powershell
node -v
npm -v
rustc -V
cargo -V
```

## Install And Run / 安装与启动

```powershell
cd D:\Projects\CivicForge
npm install
```

Frontend preview / 浏览器预览：

```powershell
npm run dev
```

Tauri desktop development / 桌面开发模式：

```powershell
npm run tauri dev
```

## Build / 构建

```powershell
npm run typecheck
npm run build
npx tauri build
```

Windows installers are generated under `src-tauri/target/release/bundle/`.

Windows 安装包生成在 `src-tauri/target/release/bundle/`：

```text
msi/CivicForge_0.1.0_x64_en-US.msi
nsis/CivicForge_0.1.0_x64-setup.exe
```

## Test / 测试

```powershell
npx vitest run --reporter=verbose
npm run typecheck
npm run build
npx tauri build
```

## Directory Structure / 目录结构

```text
CivicForge/
  src/
    app/                 typed routes, app shell, command palette
    domain/              legacy and 2.0 domain types
    features/
      today/             study plans and sessions
      practice/          four-stage writing practice
      learning/          sources, knowledge cards, repositories
      review/            active recall and review history
      progress/          traceable learning summaries
      widget/            Windows desktop widget frontend
      materials/         legacy finished-material workflow
    lib/db/              SQLite client, migrations v1-v7, FTS
    styles/              tokens, shell, feature styles
  src-tauri/             native commands, tray, windows, capabilities
  docs/                  database, backup, release documentation
```

## Database / 数据库

The desktop database is `sqlite:civicforge.db`. Migrations v1-v3 preserve the original material/rewrite/review model. Migrations v4-v8 add the 2.0 learning model, FTS5 indexes, and a compatibility repair for legacy material search triggers.

桌面数据库为 `sqlite:civicforge.db`。v1-v3 保留旧版素材、Rewrite 和复习数据；v4-v8 新增 2.0 学习模型、FTS5 索引，并修复旧版素材搜索触发器。旧表不会在升级时删除。

Migration execution uses a single native SQLite connection and a transaction. A failed migration rolls back instead of leaving a partial schema.

迁移通过原生单连接事务执行；任意语句失败都会回滚，不留下半完成表结构。

See [docs/database.md](docs/database.md).

## Backup And Restore / 备份与恢复

Use the Import/Export page to create a portable JSON archive. Archive v3 includes legacy materials, review and Rewrite logs, settings, plus the complete 2.0 learning workspace. Archives v1 and v2 remain importable.

在导入导出页可创建便携 JSON 归档。archive v3 包含旧版素材、复习日志、Rewrite 历史、设置以及完整的 2.0 学习工作区，并继续兼容导入 v1、v2 备份。

Before major upgrades, keep both the JSON archive and the local SQLite database file. See [docs/backup-restore.md](docs/backup-restore.md).

重大升级前建议同时保留 JSON 归档和本地 SQLite 数据库文件，详细说明见 [docs/backup-restore.md](docs/backup-restore.md)。

## Windows Widget / Windows 桌面小组件

Open Settings and enable the study widget. It provides today’s next task, a daily knowledge card, and quick capture. The main window and widget share SQLite and synchronize through lightweight entity-change events.

在设置页开启学习小组件后，可查看下一项任务、每日一卡并快速记录。主窗口和小组件共享 SQLite，通过轻量实体变更事件同步，不传输整份数据库快照。

The widget can remember its position and supports compact, always-on-top, and privacy modes. Autostart remains off by default.

小组件支持位置记忆、紧凑模式、置顶和隐私模式；开机启动默认关闭。
