# Database / 数据库说明

## Runtime / 运行方式

The Tauri desktop app stores `civicforge.db` in the application data directory. SQLite is the desktop source of truth. Browser preview uses versioned `localStorage` payloads only for development.

Tauri 桌面端将 `civicforge.db` 保存在应用数据目录中，SQLite 是桌面端唯一真实数据源。浏览器预览仅在开发时使用带版本号的 `localStorage` 数据。

## Migration History / 迁移历史

- v1-v3: materials, tags, topics, question types, legacy review logs, Rewrite logs, settings, and material FTS5.
- v4: source documents, excerpts, exercises, attempts, revisions, and feedback.
- v5: knowledge cards, sources, tags, question types, and usage records.
- v6: review cards, review-log association, study sessions, and session items.
- v7: FTS5 indexes for sources, knowledge cards, and exercises.
- v8: compatibility repair for legacy material FTS triggers.

- v1-v3：旧版素材、标签、主题、题型、复习日志、Rewrite 日志、设置与素材 FTS5。
- v4：资料、摘录、练习、作答、修改稿与反馈。
- v5：知识卡、来源关系、标签、题型与调用记录。
- v6：复习卡、旧日志关联、学习会话与任务项。
- v7：资料、知识卡和练习的 FTS5 索引。
- v8：修复旧版素材 FTS 触发器兼容问题。

## Safety / 安全策略

Migrations run on one native SQLite connection inside a transaction. Checksums detect modified migration assets. Any failed statement rolls back the complete migration. Existing legacy tables are preserved and are not overwritten during 2.0 migration.

迁移通过同一条原生 SQLite 连接在事务内执行，并用 checksum 检测迁移文件变更。任意语句失败都会回滚整次迁移。2.0 升级不会覆盖或删除旧表。

FTS5 triggers synchronize searchable content after insert, update, and delete. Repository writes are serialized to prevent overlapping replace operations.

FTS5 触发器会在新增、修改、删除后同步搜索内容；仓库写入会串行执行，避免多个全量保存互相覆盖。
