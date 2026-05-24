import type { AppSettings, ThemeMode } from "./appSettings";
import { getStorageDiagnostics, type StorageDiagnosticMode } from "./storageDiagnostics";

export interface SettingsPanelProps {
  readonly settings: AppSettings;
  readonly storageMode: StorageDiagnosticMode;
  readonly materialCount: number;
  readonly rewriteLogCount: number;
  readonly onSettingsChange: (settings: AppSettings) => void;
  readonly onExportArchive: () => void;
  readonly onOpenImportExport: () => void;
  readonly onResetExamples: () => void;
}

export function SettingsPanel({
  settings,
  storageMode,
  materialCount,
  rewriteLogCount,
  onSettingsChange,
  onExportArchive,
  onOpenImportExport,
  onResetExamples,
}: SettingsPanelProps) {
  const updateThemeMode = (themeMode: ThemeMode) => {
    onSettingsChange({ ...settings, themeMode });
  };

  const updateBackupReminder = (backupReminderEnabled: boolean) => {
    onSettingsChange({ ...settings, backupReminderEnabled });
  };

  const diagnostics = getStorageDiagnostics({
    storageMode,
    materialCount,
    rewriteLogCount,
    backupReminderEnabled: settings.backupReminderEnabled,
  });

  return (
    <section className="settings-workspace" aria-label="设置与备份">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Settings / Backup</p>
          <h1>把数据放稳，把界面调到适合今晚的状态。</h1>
        </div>
      </header>

      <div className="settings-grid">
        <section className="settings-section">
          <h2>外观</h2>
          <label className="field">
            <span>主题模式</span>
            <select value={settings.themeMode} onChange={(event) => updateThemeMode(event.target.value as ThemeMode)}>
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h2>本地数据</h2>
          <div className="settings-metrics">
            <div>
              <span>存储模式</span>
              <strong>{diagnostics.storageLabel}</strong>
            </div>
            <div>
              <span>素材条目</span>
              <strong>{materialCount}</strong>
            </div>
            <div>
              <span>Rewrite 记录</span>
              <strong>{rewriteLogCount}</strong>
            </div>
          </div>
          <div className="storage-diagnostics">
            <p>{diagnostics.storageDescription}</p>
            <p>{diagnostics.summary}</p>
          </div>
        </section>

        <section className="settings-section">
          <h2>备份</h2>
          <label className="switch-row inline-switch">
            <input
              type="checkbox"
              checked={settings.backupReminderEnabled}
              onChange={(event) => updateBackupReminder(event.target.checked)}
            />
            <span>显示手动备份提醒</span>
          </label>
          <div className="backup-diagnostic">
            <strong>提醒：{diagnostics.backupLabel}</strong>
            <span>{diagnostics.backupDescription}</span>
          </div>
          <div className="settings-actions">
            <button type="button" className="primary-button" onClick={onExportArchive}>
              立即导出备份
            </button>
            <button type="button" className="ghost-button" onClick={onOpenImportExport}>
              打开导入 / 恢复
            </button>
          </div>
        </section>

        <section className="settings-section danger-section">
          <h2>示例数据</h2>
          <p className="muted">重置只恢复内置示例素材，适合演示或重新开始整理。</p>
          <button type="button" className="reset-button" onClick={onResetExamples}>
            重置为示例素材
          </button>
        </section>
      </div>
    </section>
  );
}
