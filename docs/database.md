# Database / 数据库说明

CivicForge uses SQLite as its local desktop data store. The database is loaded through the Tauri SQL plugin at:

```text
sqlite:civicforge.db
```

CivicForge 使用 SQLite 作为本地桌面数据存储。桌面运行时通过 Tauri SQL 插件加载 `sqlite:civicforge.db`。

## Runtime Strategy / 运行策略

- Browser preview uses `localStorage` and displays `Preview localStorage`.
- Tauri runtime attempts to load SQLite, run migrations, seed built-in taxonomy, then display `SQLite`.
- If SQLite startup fails, the UI falls back to preview persistence instead of blocking the user.
- Materials, Rewrite logs, and app settings now have repository-backed SQLite persistence.

- 浏览器预览使用 `localStorage`，界面显示 `Preview localStorage`。
- Tauri runtime 中会尝试加载 SQLite、执行迁移、写入内置分类，然后显示 `SQLite`。
- SQLite 启动失败时，应用会回退到预览持久化，不阻塞使用。
- 素材、Rewrite 历史和应用设置已经具备 SQLite repository 持久化。

## Migrations / 迁移

Migrations live in [src/lib/db/migrations.ts](../src/lib/db/migrations.ts).

Current migrations:

1. `initial_schema`: creates all initial tables, indexes, FTS table, and material FTS triggers.
2. `rewrite_log_uuid`: adds a stable `uuid` column to `rewrite_logs` so UI rewrite history ids can round-trip through SQLite.

Runtime initialization:

1. Creates `schema_migrations` when missing.
2. Reads applied migration versions.
3. Applies pending migrations in ascending order.
4. Records each applied migration.
5. Seeds built-in topics and question types.

## Core Tables / 核心表

- `materials`: Markdown body, type, topic, review schedule, status, search keywords.
- `review_logs`: audit rows for review actions.
- `rewrite_logs`: template rewrite history; includes stable `uuid`.
- `topics`: built-in and future custom essay themes.
- `tags`: free-form labels.
- `material_tags`: material/tag many-to-many relation.
- `question_types`: built-in applicable question types.
- `material_question_types`: material/question-type many-to-many relation.
- `settings`: local app settings as key/value rows.
- `materials_fts`: FTS5 index for material search.
- `schema_migrations`: applied migration records.

## Repository Layer / 仓储层

- `src/features/materials/materialRepository.ts`: lists/searches/saves/archives materials and replaces tag/question-type links.
- `src/features/rewrite/rewriteLogRepository.ts`: lists, upserts, deletes, and replaces Rewrite history.
- `src/features/settings/settingsRepository.ts`: loads and saves `app.settings`.
- `src/features/appData/appDataService.ts`: selects SQLite or localStorage and exposes a single persistence surface to the React shell.

## Search / 搜索

`materials_fts` indexes:

- `title`
- `content_md`
- `excerpt`
- `search_keywords`

The material repository keeps a `LIKE` fallback for short Chinese queries where FTS tokenization may be less useful.

## Preview Fallback / 预览回退

The browser preview stores data under:

- `civicforge.materials.v1`
- `civicforge.rewrite.logs.v1`
- `civicforge.settings.v1`

This keeps `npm run dev` useful even when Tauri or Rust is unavailable.
