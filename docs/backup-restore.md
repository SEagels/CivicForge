# Backup And Restore / 备份与恢复

CivicForge is local-first. Backups are designed to keep the user in control of files on their own machine.

CivicForge 是本地优先应用。备份与恢复围绕用户自己的本地文件展开。

## Current Implementation / 当前实现

The Import/Export page supports a portable JSON archive.

Archive v3 contains:

- Legacy material state
- Review and Rewrite history
- App settings
- Complete 2.0 learning workspace: sources, exercises, attempts, revisions, knowledge cards, review cards, and study sessions
- Archive version and export timestamp

archive v3 包含旧版素材状态、复习与 Rewrite 历史、应用设置，以及资料、练习、作答、修改稿、知识卡片、复习卡和学习会话等完整 2.0 工作区数据。

## File Operations / 文件操作

In Tauri desktop runtime:

- Export uses `@tauri-apps/plugin-dialog` to choose a save path.
- Export uses `@tauri-apps/plugin-fs` to write the JSON file.
- Restore uses the Tauri dialog to choose a JSON file.
- Restore uses the Tauri fs plugin to read the selected file.

In browser preview:

- Export falls back to a Blob download.
- Restore can use the file input or pasted JSON text.

在 Tauri 桌面运行时，导出和恢复优先使用官方 dialog/fs 插件。浏览器预览中，导出回退为浏览器下载，恢复支持文件输入或粘贴 JSON。

## Restore Safety / 恢复安全

Restore currently validates:

- `appName` is `CivicForge`
- archive version is compatible (`v1`, `v2`, and `v3` are accepted)
- material state shape is valid
- rewrite logs shape is valid
- settings and 2.0 learning workspace shapes are valid

If validation fails, the app does not replace current state.

恢复时会校验应用名、归档版本、素材结构、Rewrite 结构和设置结构。校验失败不会覆盖当前数据。

## Upgrade Backup / 升级前备份

Before a major upgrade, export archive v3 and keep a copy of the SQLite file after fully closing CivicForge. JSON is the portable recovery format; the SQLite copy is an additional exact snapshot.

重大升级前，请先导出 archive v3，并在完全退出 CivicForge 后复制 SQLite 文件。JSON 用于跨版本恢复，SQLite 副本作为额外的精确快照。

## Future Enhancements / 后续增强

Possible later work:

- Daily first-launch backup.
- Retention policy, such as keeping the latest 10 backups.
- Restore preview before applying.
- Export selected materials as Markdown with frontmatter.

后续可以继续增强为完整 SQLite 文件备份、每日首次启动自动备份、备份保留策略、恢复前预览，以及 Markdown 归档导出。
