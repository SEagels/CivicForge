# Backup And Restore / 备份与恢复

CivicForge keeps user data local by default. Backup and restore features are designed around the SQLite database file plus optional structured exports.

CivicForge 默认只在本地保存数据。备份与恢复围绕 SQLite 数据库文件和结构化导出设计。

## Backup Types / 备份类型

### Full Database Backup / 完整数据库备份

Creates a copy of the SQLite database file, intended for reliable restore.

生成 SQLite 数据库文件副本，适合完整恢复。

Recommended file name:

```text
civicforge-backup-YYYYMMDD-HHmmss.db
```

### JSON Export / JSON 导出

Exports materials, topics, tags, question types, review logs, and rewrite logs as structured data.

导出素材、主题、标签、题型、复习日志和改写日志，适合跨版本迁移。

### Markdown Export / Markdown 导出

Exports each material as a Markdown file with frontmatter metadata.

将每条素材导出为带 frontmatter 的 Markdown 文件，适合长期归档和外部编辑。

## Restore Safety / 恢复安全

Before replacing the active database, the app should:

1. Verify the selected file exists.
2. Open it as SQLite.
3. Check that required tables exist.
4. Check `schema_migrations`.
5. Create a safety backup of the current database.
6. Replace the active database.
7. Ask the user to restart the app.

恢复前应用应先校验数据库结构，并为当前数据库生成安全备份。

## Retention / 保留策略

Phase one only documents the policy. Later implementation can support:

- Manual backup.
- Daily first-launch backup.
- Retention count, such as keeping the latest 10 backups.
- Backup directory selection through the Tauri dialog plugin.
