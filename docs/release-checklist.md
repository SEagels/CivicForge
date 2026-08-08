# Windows Release Checklist / Windows 发布检查

## Automated / 自动化

```powershell
npm ci
npx vitest run --reporter=verbose
npm run typecheck
npm run build
npx tauri build
git diff --check
```

Tests, TypeScript, Vite, Rust, MSI, and NSIS must all succeed. `package-lock.json` must match `package.json`.

## Upgrade / 升级

- Export archive v3 from the previous release.
- Upgrade a copied legacy SQLite fixture and verify entity counts.
- Confirm a failed migration leaves no partial schema.
- Import archive v1, v2, and v3 fixtures.
- Verify legacy materials and Rewrite history remain readable.

## Desktop Smoke Test / 桌面烟测

- Today starts and resumes 15/30/60-minute plans.
- Practice restores reading, outline, answer, timer, and reflection state.
- A practice can extract a card; the card can be verified, reviewed, and inserted into another answer.
- Review hides the answer before rating and supports all five modes.
- Again/Hard can return to the card or create an 8-minute micro practice.
- Progress rows open concrete weak cards or tasks.
- Widget and main window synchronize without frequent polling.
- Light/dark themes and reduced motion work at 720px and common desktop sizes.

## Installers / 安装包

- Install and launch both MSI and NSIS on Windows.
- Upgrade over the previous release without data loss.
- Confirm tray, widget, multi-monitor position restore, and uninstall behavior.

```text
src-tauri/target/release/bundle/msi/CivicForge_0.1.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/CivicForge_0.1.0_x64-setup.exe
```
