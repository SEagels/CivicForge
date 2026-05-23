# Database / 数据库说明

CivicForge uses SQLite as the local data store. The app is designed to be local-first: the database file is the source of truth, and cloud sync is intentionally out of scope.

CivicForge 使用 SQLite 作为本地数据存储。应用以本地优先为核心，数据库文件是唯一事实来源，云同步不在项目范围内。

## Runtime Strategy / 运行策略

- Enable `PRAGMA foreign_keys = ON`.
- Use `PRAGMA journal_mode = WAL` for better desktop write behavior.
- Track applied migrations in `schema_migrations`.
- Seed built-in topics and question types during initialization.
- Keep SQL migrations idempotent where possible.
- Load the app database through the Tauri SQL plugin at `sqlite:civicforge.db`.

阶段七新增了 `src/lib/db/databaseClient.ts` 和 `src/lib/db/databaseInitializer.ts`。前者负责在 Tauri runtime 可用时加载 `sqlite:civicforge.db`，后者负责执行迁移、记录版本，并写入内置主题和题型。普通浏览器预览环境下数据库 client 会返回 `null`，前端继续使用现有 `localStorage` fallback。

## Initial Tables / 初始表

- `materials`: material title, Markdown body, metadata, review scheduling fields.
- `review_logs`: one row per review action.
- `rewrite_logs`: rewrite workshop history.
- `topics`: built-in and custom essay themes.
- `tags`: free-form tags.
- `material_tags`: material/tag many-to-many relation.
- `question_types`: built-in applicable question types.
- `material_question_types`: material/question-type many-to-many relation.
- `settings`: local user preferences.
- `materials_fts`: FTS5 search index.
- `schema_migrations`: migration records.

## Search / 搜索

`materials_fts` is planned as an FTS5 virtual table with `trigram` tokenization. It indexes:

- `title`
- `content_md`
- `excerpt`
- `search_keywords`

Short Chinese queries can be handled by a `LIKE` fallback in the repository layer.

## Phase Four Preview Persistence / 第四阶段预览持久化

The current React preview stores the material library state in browser `localStorage` under `civicforge.materials.v1`. This is intentionally a temporary development bridge so title/body/metadata edits survive refreshes while the native Tauri SQLite runtime is still pending.

当前 React 预览会把素材库状态保存到浏览器 `localStorage` 的 `civicforge.materials.v1` 键下。这是临时开发桥接方案，用于在原生 Tauri SQLite 运行期接入前验证标题、正文和元数据编辑的刷新恢复。

The preview persistence layer:

- Saves a versioned payload.
- Returns `null` for malformed or incompatible stored data.
- Allows the UI to reset back to the built-in sample materials.

该预览持久化层会保存带版本号的数据；遇到损坏或不兼容数据时返回 `null`，让 UI 回落到内置示例素材；同时提供重置示例数据入口。

## Material Repository SQL Assets / 素材仓储 SQL 资产

`src/lib/db/materialRepositorySql.ts` contains SQL constants that will be used when the Tauri SQL plugin is wired into the app. The assets are covered by Vitest so the expected repository contract is explicit before runtime integration.

`src/lib/db/materialRepositorySql.ts` 保存后续接入 Tauri SQL 插件时会使用的 SQL 常量，并通过 Vitest 固化仓储层契约。

Covered statements:

- `listActiveMaterials`: list active and draft materials with topic, tags, and question types.
- `searchMaterials`: search `materials_fts` and fall back to `LIKE` for short Chinese queries.
- `upsertMaterial`: insert or update the material core fields by `uuid`.
- `archiveMaterial`: mark a material as archived without deleting history.
- `upsertTagByName`: create or update free-form tags before relation replacement.
- `deleteMaterialTags` and `insertMaterialTagBySlug`: replace material tags.
- `deleteMaterialQuestionTypes` and `insertMaterialQuestionTypeBySlug`: replace applicable question types.

`src/features/materials/materialRepository.ts` maps SQLite rows into `MaterialDraft`, builds positional bind parameters for Tauri SQL, and exposes list/search/save/archive operations. The React UI is still using preview persistence in this phase; repository wiring into the UI is the next runtime integration step.

## Review Fields / 复习字段

The first review implementation stores scheduling state directly on `materials`:

- `review_enabled`
- `review_ease`
- `review_interval_days`
- `review_repetitions`
- `review_lapses`
- `next_review_at`
- `last_reviewed_at`

Each review action is also appended to `review_logs` so future algorithm changes can be audited or recalculated.

## Migration Policy / 迁移策略

Migrations are represented in `src/lib/db/migrations.ts`. Each migration has:

- `version`
- `name`
- `sql`

The runtime migrator will:

1. Create `schema_migrations` if missing.
2. Read applied versions.
3. Apply pending migrations in ascending order.
4. Insert a migration record after each successful migration.
5. Roll back the current transaction on failure.

## Runtime UI Wiring / 运行时接入

The React app now attempts SQLite startup from `MaterialLibrary`:

1. `loadCivicForgeDatabase()` returns `null` in browser preview and loads `sqlite:civicforge.db` in Tauri.
2. `initializeCivicForgeDatabase()` creates migration metadata, applies pending schema SQL, and seeds built-in topics/question types.
3. `createMaterialRepository()` reads active/draft materials into the UI.
4. If SQLite has no material rows yet, the current local sample/localStorage state is inserted as the initial library.
5. Later material edits are written back through `saveMaterial()`; archived items call `archiveMaterial()`.

普通 `npm run dev` 预览环境没有 Tauri runtime，因此会继续显示 `Preview localStorage`。在 Tauri runtime 中初始化成功后，Dashboard 与 Settings 会显示 `SQLite`。
