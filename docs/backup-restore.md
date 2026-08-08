# Backup And Restore / 备份与恢复

## Recommended Backup / 推荐备份

1. Open **Import/Export / 导入导出** and export an archive v3 JSON file.
2. Close CivicForge before copying `civicforge.db` from the application data directory.
3. Store the JSON archive and database copy in separate safe locations.

1. 打开“导入导出”，导出 archive v3 JSON 文件。
2. 关闭 CivicForge 后，再复制应用数据目录中的 `civicforge.db`。
3. 将 JSON 归档和数据库副本分别保存在可靠位置。

Archive v3 contains legacy materials, review and Rewrite logs, settings, sources, excerpts, exercises, attempts, revisions, feedback, knowledge cards, provenance, usage records, review cards, and study sessions.

archive v3 包含旧素材、复习与 Rewrite 日志、设置，以及资料、摘录、练习、作答、修改稿、反馈、知识卡、来源、调用记录、复习卡和学习会话。

## Restore / 恢复

Use **Import/Export -> Restore** and choose a valid archive. CivicForge validates it before replacing current state. Archive v1 and v2 remain importable; missing 2.0 collections are initialized safely.

在“导入导出”中选择恢复文件。CivicForge 会先校验归档，再替换当前状态。archive v1、v2 仍可导入，缺失的 2.0 集合会安全初始化。

After restore, verify material count, knowledge cards, due reviews, practice history, and settings. Restart once to confirm the state was written to SQLite.

恢复后请检查素材数量、知识卡、到期复习、训练历史和设置，并重启一次应用，确认恢复结果已写入 SQLite。

If an upgrade migration fails, the transaction rolls back automatically. Preserve the failed database before reinstalling or restoring so it remains available for diagnosis.

若升级迁移失败，事务会自动回滚。重新安装或恢复前请保留故障数据库原件，以便诊断。
