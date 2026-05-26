import { useMemo, useState } from "react";
import type { MaterialDraft } from "../materials/materialModel";
import {
  REWRITE_TARGETS,
  createRewriteLog,
  generateRewritePrompt,
  type RewriteLog,
  type RewriteTargetId,
} from "./rewriteWorkshop";
import {
  createManualTemplateProvider,
  filterRewriteLogs,
  getRewriteDraftFromLog,
  getRewriteMetrics,
  getRewritePromptCopyStatus,
  type RewriteHistoryFilter,
  type RewritePromptCopyState,
} from "./rewriteWorkspace";

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
  const [historyFilter, setHistoryFilter] = useState<RewriteHistoryFilter>("all");
  const [copyState, setCopyState] = useState<RewritePromptCopyState>("idle");
  const [providerMessage, setProviderMessage] = useState("外部模型接口已预留，本阶段不发起网络调用。");
  const [lastSavedLog, setLastSavedLog] = useState<RewriteLog | null>(null);
  const provider = useMemo(() => createManualTemplateProvider(), []);
  const metrics = useMemo(() => getRewriteMetrics(originalText, resultText), [originalText, resultText]);
  const filteredLogs = useMemo(() => filterRewriteLogs(logs, historyFilter), [historyFilter, logs]);
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

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptTemplate);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const runProviderPlaceholder = async () => {
    const result = await provider.rewrite({ promptTemplate });
    setProviderMessage(result.ok ? "已获得模型结果。" : result.message);
  };

  const saveHistory = (): RewriteLog | null => {
    if (!canSave) {
      return null;
    }

    const log = createRewriteLog({
      sourceMaterialId: sourceMaterialId || null,
      targetId,
      originalText,
      extraInstruction,
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

  const loadHistory = (log: RewriteLog) => {
    const draft = getRewriteDraftFromLog(log);
    setSourceMaterialId(draft.sourceMaterialId);
    setTargetId(draft.targetId);
    setOriginalText(draft.originalText);
    setResultText(draft.resultText);
    setExtraInstruction(draft.extraInstruction);
    setLastSavedLog(log);
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

      <div className="rewrite-flow">
        <section className="rewrite-panel" aria-label="原文与目标">
          <PanelTitle step="1" title="原文" hint="导入素材或手动粘贴" />
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
            <select
              value={targetId}
              onChange={(event) => {
                setTargetId(event.target.value as RewriteTargetId);
                setLastSavedLog(null);
              }}
            >
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
          <PanelTitle step="2" title="提示模板" hint="复制到外部模型或手动参考" />
          <textarea className="prompt-preview" value={promptTemplate} readOnly aria-label="生成提示模板" />
          <div className="rewrite-actions">
            <button type="button" className="primary-button" onClick={copyPrompt}>
              {getRewritePromptCopyStatus(copyState)}
            </button>
            <button type="button" className="ghost-button" onClick={runProviderPlaceholder}>
              模型接口预留
            </button>
          </div>
          <div className="rewrite-model-status">
            <span>{provider.label}</span>
            <strong>{providerMessage}</strong>
          </div>
        </section>

        <section className="rewrite-panel" aria-label="改写结果">
          <PanelTitle step="3" title="改写结果" hint="编辑后保存历史或转为素材" />
          <div className="rewrite-metrics">
            <Metric label="原文" value={`${metrics.originalCount} 字`} />
            <Metric label="结果" value={`${metrics.resultCount} 字`} />
            <Metric label="变化" value={formatDelta(metrics.deltaCount)} />
            <Metric label="比例" value={metrics.ratio === 0 ? "-" : `${metrics.ratio}x`} />
          </div>

          <label className="rewrite-textarea">
            <span>手动编辑结果</span>
            <textarea
              value={resultText}
              onChange={(event) => {
                setResultText(event.target.value);
                setLastSavedLog(null);
              }}
              placeholder="把提示模板交给外部模型，或直接在这里手动改写..."
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

      <section className="rewrite-comparison" aria-label="原文结果对比">
        <div className="pane-header compact">
          <div>
            <p className="eyebrow">Compare</p>
            <h2>原文 / 结果对比</h2>
          </div>
          <span className={`rewrite-direction ${metrics.direction}`}>{getDirectionLabel(metrics.direction)}</span>
        </div>
        <div className="rewrite-compare-grid">
          <ComparisonBlock title="原文" text={originalText} empty="尚未输入原文" />
          <ComparisonBlock title="结果" text={resultText} empty="尚未填写结果" />
        </div>
      </section>

      <section className="rewrite-history" aria-label="改写历史">
        <div className="pane-header compact">
          <div>
            <p className="eyebrow">History</p>
            <h2>改写历史</h2>
          </div>
          <label className="rewrite-history-filter">
            <span>筛选</span>
            <select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value as RewriteHistoryFilter)}>
              <option value="all">全部目标</option>
              {REWRITE_TARGETS.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="empty-list">
            <strong>暂无匹配的改写历史</strong>
            <span>保存结果后会出现在这里，可再次载入编辑或保存为素材。</span>
          </div>
        ) : (
          <div className="rewrite-history-list">
            {filteredLogs.slice(0, 8).map((log) => (
              <article key={log.id} className="rewrite-history-item">
                <div>
                  <strong>{getTargetLabel(log.targetId)}</strong>
                  <span>{getSourceLabel(log, materials)} · {new Date(log.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <p>{log.resultText}</p>
                <div className="rewrite-history-actions">
                  <button type="button" className="link-button" onClick={() => loadHistory(log)}>
                    载入编辑
                  </button>
                  <button type="button" className="link-button" onClick={() => onSaveAsMaterial(log)}>
                    保存为素材
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function PanelTitle({ step, title, hint }: { readonly step: string; readonly title: string; readonly hint: string }) {
  return (
    <div className="rewrite-panel-title">
      <span>{step}</span>
      <div>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ComparisonBlock({ title, text, empty }: { readonly title: string; readonly text: string; readonly empty: string }) {
  return (
    <article className="rewrite-compare-block">
      <span>{title}</span>
      <p>{text.trim() || empty}</p>
    </article>
  );
}

function formatDelta(deltaCount: number): string {
  if (deltaCount > 0) {
    return `+${deltaCount}`;
  }

  return `${deltaCount}`;
}

function getDirectionLabel(direction: "compressed" | "expanded" | "unchanged"): string {
  if (direction === "compressed") {
    return "压缩";
  }

  if (direction === "expanded") {
    return "扩写";
  }

  return "未变化";
}

function getTargetLabel(targetId: RewriteTargetId): string {
  return REWRITE_TARGETS.find((target) => target.id === targetId)?.label ?? targetId;
}

function getSourceLabel(log: RewriteLog, materials: readonly MaterialDraft[]): string {
  if (!log.sourceMaterialId) {
    return "手动输入";
  }

  return materials.find((material) => material.id === log.sourceMaterialId)?.title ?? "来源素材";
}
