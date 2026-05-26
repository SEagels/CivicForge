import { useState } from "react";
import type { RewriteMaterialInput } from "../rewrite/rewriteWorkshop";
import { readSourceTextFile } from "./sourceFileAdapter";
import {
  buildCandidateMaterialInputFromSource,
  createLocalFileSourceCard,
  createUrlSourceCard,
  type SourceCard,
} from "./sourceImport";

export interface ImportExportPanelProps {
  readonly archiveJson: string;
  readonly onDownloadArchive: () => void | Promise<void>;
  readonly onRestoreArchive: (rawArchive: string) => boolean;
  readonly onRestoreFromFile?: () => Promise<boolean>;
  readonly onCreateSourceMaterial?: (input: RewriteMaterialInput) => void;
}

export function ImportExportPanel({
  archiveJson,
  onDownloadArchive,
  onRestoreArchive,
  onRestoreFromFile,
  onCreateSourceMaterial,
}: ImportExportPanelProps) {
  const [rawArchive, setRawArchive] = useState("");
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [sourceCard, setSourceCard] = useState<SourceCard | null>(null);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);

  const restoreArchive = () => {
    const restored = onRestoreArchive(rawArchive);
    setRestoreMessage(restored ? "恢复成功，素材、Rewrite 历史和设置已更新。" : "恢复失败，请检查 JSON 是否来自 CivicForge。");
  };

  const restoreFromFile = async () => {
    if (!onRestoreFromFile) {
      return;
    }

    const restored = await onRestoreFromFile();
    setRestoreMessage(restored ? "恢复成功，已从本地备份文件读取数据。" : "未恢复数据，可能是取消选择或文件格式不正确。");
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

  const buildUrlSource = () => {
    const card = createUrlSourceCard({
      url: sourceUrl,
      title: sourceTitle,
      sourceName,
      content: sourceContent,
    });
    setSourceCard(card);
    setSourceMessage("已生成来源卡片，可保存为候选素材。");
  };

  const readSourceFromTauriFile = async () => {
    const result = await readSourceTextFile();

    if (!result.ok) {
      setSourceMessage(
        result.reason === "cancelled" ? "未选择资料文件。" : "当前环境无法直接读取文件，可使用下方文件选择。",
      );
      return;
    }

    const card = createLocalFileSourceCard({
      filename: result.filename,
      content: result.content,
    });
    setSourceCard(card);
    setSourceTitle(card.title);
    setSourceName(card.sourceName);
    setSourceContent(card.content);
    setSourceUrl("");
    setSourceMessage("已从本地文件生成来源卡片。");
  };

  const importSourceFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const card = createLocalFileSourceCard({
        filename: file.name,
        content: String(reader.result ?? ""),
      });
      setSourceCard(card);
      setSourceTitle(card.title);
      setSourceName(card.sourceName);
      setSourceContent(card.content);
      setSourceUrl("");
      setSourceMessage("已从本地文件生成来源卡片。");
    });
    reader.readAsText(file);
  };

  const saveSourceCandidate = () => {
    if (!sourceCard || !onCreateSourceMaterial) {
      return;
    }

    onCreateSourceMaterial(buildCandidateMaterialInputFromSource(sourceCard));
  };

  return (
    <section className="import-export-workspace" aria-label="导入导出">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Import / Export</p>
          <h1>把本地数据打包成一个可以带走的备份。</h1>
        </div>
        <button type="button" className="primary-button" onClick={() => void onDownloadArchive()}>
          下载 JSON 备份
        </button>
      </header>

      <div className="import-export-grid">
        <section className="archive-section source-import-section">
          <h2>资料导入</h2>
          <p className="muted">只处理你手动提供的单篇资料或本地 TXT/MD 文件，不做自动爬取。</p>
          <div className="source-import-grid">
            <label className="field">
              <span>官方资料 URL</span>
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://www.gov.cn/..."
              />
            </label>
            <label className="field">
              <span>来源名称</span>
              <input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="国务院 / 部委 / 本地文件名"
              />
            </label>
          </div>
          <label className="field">
            <span>资料标题</span>
            <input
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="例如：推进基层治理现代化"
            />
          </label>
          <label className="field">
            <span>资料正文或摘录</span>
            <textarea
              value={sourceContent}
              onChange={(event) => setSourceContent(event.target.value)}
              rows={8}
              placeholder="粘贴公开资料中的必要段落、你的摘要或本地文件内容。"
            />
          </label>
          <div className="settings-actions">
            <button
              type="button"
              className="primary-button"
              onClick={buildUrlSource}
              disabled={!sourceUrl.trim() || !sourceContent.trim()}
            >
              生成 URL 来源卡
            </button>
            <button type="button" className="ghost-button" onClick={() => void readSourceFromTauriFile()}>
              读取本地 TXT/MD
            </button>
          </div>
          <label className="field">
            <span>或选择本地 TXT / Markdown</span>
            <input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={(event) => importSourceFile(event.target.files?.[0])} />
          </label>
          {sourceCard ? (
            <article className="source-card-preview">
              <div>
                <span>{sourceCard.sourceType === "url" ? "URL 来源" : "本地文件"}</span>
                <strong>{sourceCard.title}</strong>
                <p>{sourceCard.excerpt}</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={saveSourceCandidate}
                disabled={!onCreateSourceMaterial}
              >
                保存为候选素材
              </button>
            </article>
          ) : null}
          {sourceMessage ? <p className="restore-message">{sourceMessage}</p> : null}
        </section>

        <section className="archive-section">
          <h2>当前备份预览</h2>
          <pre className="archive-preview">{archiveJson}</pre>
        </section>

        <section className="archive-section">
          <h2>恢复备份</h2>
          {onRestoreFromFile ? (
            <div className="settings-actions">
              <button type="button" className="ghost-button" onClick={() => void restoreFromFile()}>
                从本地文件选择
              </button>
            </div>
          ) : null}
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
