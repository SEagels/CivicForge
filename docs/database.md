# Database / 数据库说明

CivicForge uses SQLite as the local data store. The app is designed to be local-first: the database file is the source of truth, and cloud sync is intentionally out of scope.

CivicForge 使用 SQLite 作为本地数据存储。应用以本地优先为核心，数据库文件是唯一事实来源，云同步不在项目范围内。

## Runtime Strategy / 运行策略

- Enable `PRAGMA foreign_keys = ON`.
- Use `PRAGMA journal_mode = WAL` for better desktop write behavior.
- Track applied migrations in `schema_migrations`.
- Seed built-in topics and question types during initialization.
- Keep SQL migrations idempotent where possible.

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
