# Backup And Restore / 备份与恢复

CivicForge is local-first. Backups are designed to keep the user in control of files on their own machine.

CivicForge 是本地优先应用。备份与恢复围绕用户自己的本地文件展开。

## Current Implementation / 当前实现

The Import/Export page supports a portable JSON archive.

The archive contains:

- Material state
- Rewrite history
- App settings
- Archive version
- Export timestamp

导入导出页当前支持 JSON 归档备份，内容包括素材状态、Rewrite 历史、应用设置、归档版本号和导出时间。

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
- archive version is compatible
- material state shape is valid
- rewrite logs shape is valid
- settings shape is valid

If validation fails, the app does not replace current state.

恢复时会校验应用名、归档版本、素材结构、Rewrite 结构和设置结构。校验失败不会覆盖当前数据。

## Future Enhancements / 后续增强

Possible later work:

- Full SQLite database file backup.
- Daily first-launch backup.
- Retention policy, such as keeping the latest 10 backups.
- Restore preview before applying.
- Export selected materials as Markdown with frontmatter.

后续可以继续增强为完整 SQLite 文件备份、每日首次启动自动备份、备份保留策略、恢复前预览，以及 Markdown 归档导出。
