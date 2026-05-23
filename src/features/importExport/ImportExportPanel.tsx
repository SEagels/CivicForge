import { useState } from "react";

export interface ImportExportPanelProps {
  readonly archiveJson: string;
  readonly onDownloadArchive: () => void;
  readonly onRestoreArchive: (rawArchive: string) => boolean;
}

export function ImportExportPanel({ archiveJson, onDownloadArchive, onRestoreArchive }: ImportExportPanelProps) {
  const [rawArchive, setRawArchive] = useState("");
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const restoreArchive = () => {
    const restored = onRestoreArchive(rawArchive);
    setRestoreMessage(restored ? "恢复成功，素材、Rewrite 历史和设置已更新。" : "恢复失败，请检查 JSON 是否来自 CivicForge。");
  };

  const importFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setRawArchive(String(reader.result ?? ""));
      setRestoreMessage(null);
    });
    reader.readAsText(file);
  };

  return (
    <section className="import-export-workspace" aria-label="导入导出">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Import / Export</p>
          <h1>把本地数据打包成一个可以带走的备份。</h1>
        </div>
        <button type="button" className="primary-button" onClick={onDownloadArchive}>
          下载 JSON 备份
        </button>
      </header>

      <div className="import-export-grid">
        <section className="archive-section">
          <h2>当前备份预览</h2>
          <pre className="archive-preview">{archiveJson}</pre>
        </section>

        <section className="archive-section">
          <h2>恢复备份</h2>
          <label className="field">
            <span>选择 JSON 文件</span>
            <input type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
          </label>
          <label className="field">
            <span>或粘贴备份内容</span>
            <textarea
              value={rawArchive}
              onChange={(event) => {
                setRawArchive(event.target.value);
                setRestoreMessage(null);
              }}
              rows={14}
              placeholder="粘贴 civicforge-backup-YYYY-MM-DD.json 的内容"
            />
          </label>
          <div className="settings-actions">
            <button type="button" className="primary-button" onClick={restoreArchive} disabled={!rawArchive.trim()}>
              恢复到本地
            </button>
          </div>
          {restoreMessage ? <p className="restore-message">{restoreMessage}</p> : null}
        </section>
      </div>
    </section>
  );
}
