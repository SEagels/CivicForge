# Release Checklist / 发布验收清单

Use this checklist before sharing a CivicForge Windows build for daily study use.

在把 CivicForge Windows 构建版本用于日常学习前，按这份清单做一次验收。

## 1. Environment / 环境

- Confirm Node and npm are available.
- Confirm Rust/Cargo is available. If needed, run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
```

- Work from the project folder:

```powershell
cd D:\Projects\CivicForge
```

## 2. Automated Checks / 自动化检查

Run:

```powershell
npm test -- --run
npm run typecheck
npm run build
npx tauri build
```

Expected result:

- Vitest exits with zero failed tests.
- TypeScript exits successfully.
- Vite produces `dist/`.
- Tauri produces Windows bundles.

期望结果：

- Vitest 没有失败用例。
- TypeScript 类型检查通过。
- Vite 成功生成 `dist/`。
- Tauri 成功生成 Windows 安装包。

## 3. Release Artifacts / 安装包位置

Expected Windows package paths:

```text
src-tauri/target/release/bundle/msi/CivicForge_0.1.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/CivicForge_0.1.0_x64-setup.exe
```

## 4. Desktop Smoke Test / 桌面烟测

Launch the release executable or installed app and verify:

- The app opens to Dashboard.
- Settings shows `桌面 SQLite` in the local data section.
- Creating a material updates the material count.
- Editing a material title or Markdown body persists after closing and reopening the app.
- Review ratings update the next review time.
- Rewrite can save a history record and save the result as a new material.
- Import/Export can export a JSON archive through the desktop file dialog.
- Restoring a valid JSON archive returns to Dashboard and updates material/settings state.

启动 release exe 或安装后的应用后，确认：

- 应用能打开到 Dashboard。
- 设置页的本地数据区域显示 `桌面 SQLite`。
- 新建素材后素材数量会更新。
- 修改素材标题或 Markdown 正文后，关闭重开仍能保留。
- 复习评分会更新下次复习时间。
- Rewrite 可以保存历史，也可以把结果保存为新素材。
- 导入导出页能通过桌面文件选择框导出 JSON 备份。
- 恢复合法 JSON 备份后会回到 Dashboard，并更新素材与设置状态。

## 5. Known Warnings / 已知提醒

- Vite may warn that the Milkdown bundle chunk is larger than 500 kB. This is acceptable for the current desktop MVP.
- If another Cargo process is running, `npx tauri build` may print `Blocking waiting for file lock on package cache`. Wait for the other build to finish, or stop the stale Cargo/Rust process before rebuilding.

- Vite 可能提示 Milkdown 相关 chunk 超过 500 kB。对当前桌面 MVP 来说可以接受。
- 如果另一个 Cargo 进程正在运行，`npx tauri build` 可能出现 `Blocking waiting for file lock on package cache`。等待其他构建结束，或停止残留的 Cargo/Rust 进程后再构建。
