import { useMemo, useState } from "react";
import type { MaterialDraft } from "../materials/materialModel";
import {
  REWRITE_TARGETS,
  createRewriteLog,
  generateRewritePrompt,
  type RewriteLog,
  type RewriteTargetId,
} from "./rewriteWorkshop";

interface RewritePanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly logs: readonly RewriteLog[];
  readonly onSaveLog: (log: RewriteLog) => void;
  readonly onSaveAsMaterial: (log: RewriteLog) => void;
}

export function RewritePanel({ materials, logs, onSaveLog, onSaveAsMaterial }: RewritePanelProps) {
  const [sourceMaterialId, setSourceMaterialId] = useState("");
  const [targetId, setTargetId] = useState<RewriteTargetId>("compress");
  const [originalText, setOriginalText] = useState("");
  const [extraInstruction, setExtraInstruction] = useState("");
  const [resultText, setResultText] = useState("");
  const [lastSavedLog, setLastSavedLog] = useState<RewriteLog | null>(null);

  const promptTemplate = useMemo(
    () =>
      generateRewritePrompt({
        targetId,
        originalText,
        extraInstruction,
      }),
    [extraInstruction, originalText, targetId],
  );
  const canSave = originalText.trim().length > 0 && resultText.trim().length > 0;

  const importMaterial = (materialId: string) => {
    setSourceMaterialId(materialId);
    const material = materials.find((item) => item.id === materialId);

    if (!material) {
      return;
    }

    setOriginalText(material.contentMd || material.excerpt);
    setResultText("");
    setLastSavedLog(null);
  };

  const saveHistory = (): RewriteLog | null => {
    if (!canSave) {
      return null;
    }

    const log = createRewriteLog({
      sourceMaterialId: sourceMaterialId || null,
      targetId,
      originalText,
      promptTemplate,
      resultText,
    });

    onSaveLog(log);
    setLastSavedLog(log);
    return log;
  };

  const saveAsMaterial = () => {
    const log = lastSavedLog ?? saveHistory();

    if (!log) {
      return;
    }

    onSaveAsMaterial(log);
  };

  return (
    <section className="rewrite-workspace" aria-label="Rewrite 工坊">
      <div className="rewrite-header">
        <div>
          <p className="eyebrow">Rewrite</p>
          <h1>改写工坊</h1>
        </div>
        <div className="rewrite-status">
          <span>历史</span>
          <strong>{logs.length}</strong>
        </div>
      </div>

      <div className="rewrite-grid">
        <section className="rewrite-panel" aria-label="原文与目标">
          <h2>原文</h2>
          <label className="field">
            <span>从素材库导入</span>
            <select value={sourceMaterialId} onChange={(event) => importMaterial(event.target.value)}>
              <option value="">不导入，手动粘贴</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>改写目标</span>
            <select value={targetId} onChange={(event) => setTargetId(event.target.value as RewriteTargetId)}>
              {REWRITE_TARGETS.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>补充要求</span>
            <input
              value={extraInstruction}
              onChange={(event) => setExtraInstruction(event.target.value)}
              placeholder="例如：控制在 120 字以内"
            />
          </label>

          <label className="rewrite-textarea">
            <span>原文内容</span>
            <textarea
              value={originalText}
              onChange={(event) => {
                setOriginalText(event.target.value);
                setLastSavedLog(null);
              }}
              placeholder="粘贴需要改写的素材、表达或段落..."
            />
          </label>
        </section>

        <section className="rewrite-panel" aria-label="提示模板">
          <h2>提示模板</h2>
          <textarea className="prompt-preview" value={promptTemplate} readOnly aria-label="生成提示模板" />
        </section>

        <section className="rewrite-panel" aria-label="改写结果">
          <h2>结果</h2>
          <label className="rewrite-textarea">
            <span>手动编辑结果</span>
            <textarea
              value={resultText}
              onChange={(event) => {
                setResultText(event.target.value);
                setLastSavedLog(null);
              }}
              placeholder="把生成的提示模板交给外部模型，或直接在这里手动改写..."
            />
          </label>

          <div className="rewrite-actions">
            <button type="button" className="primary-button" onClick={saveHistory} disabled={!canSave}>
              保存历史
            </button>
            <button type="button" className="ghost-button" onClick={saveAsMaterial} disabled={!canSave}>
              保存为新素材
            </button>
          </div>
        </section>
      </div>

      <section className="rewrite-history" aria-label="改写历史">
        <div className="pane-header compact">
          <div>
            <p className="eyebrow">History</p>
            <h2>改写历史</h2>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="empty-list">
            <strong>暂无改写历史</strong>
            <span>保存结果后会出现在这里。</span>
          </div>
        ) : (
          <div className="rewrite-history-list">
            {logs.slice(0, 6).map((log) => (
              <article key={log.id} className="rewrite-history-item">
                <div>
                  <strong>{getTargetLabel(log.targetId)}</strong>
                  <span>{new Date(log.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <p>{log.resultText}</p>
                <button type="button" className="link-button" onClick={() => onSaveAsMaterial(log)}>
                  保存为素材
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function getTargetLabel(targetId: RewriteTargetId): string {
  return REWRITE_TARGETS.find((target) => target.id === targetId)?.label ?? targetId;
}
