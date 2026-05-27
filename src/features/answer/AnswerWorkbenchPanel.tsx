import { useMemo, useState } from "react";
import { BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft } from "../materials/materialModel";
import {
  ANSWER_GOAL_IDS,
  buildRewriteDraftFromAnswerDraft,
  buildMaterialInputFromAnswerDraft,
  createStructuredAnswerDraft,
  getAnswerTemplate,
  getMaterialTypeLabel,
  getQuestionTypeLabel,
  getTopicLabel,
  groupCallableMaterials,
  insertMaterialIntoSlot,
  rankCallableMaterials,
  renderStructuredDraftToMarkdown,
  updateStructuredDraftSlot,
  type AnswerGoalId,
  type AnswerMaterialInput,
  type AnswerRewriteDraft,
  type AnswerSlot,
  type AnswerWorkbenchStructuredDraft,
  type CallableMaterialScore,
} from "./answerWorkbench";

interface AnswerWorkbenchPanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly onSaveDraftAsMaterial: (input: AnswerMaterialInput) => void;
  readonly onSendToRewrite: (draft: AnswerRewriteDraft) => void;
}

const ANSWER_GOAL_LABELS: Record<AnswerGoalId, string> = {
  "call-materials": "调用素材",
  "build-answer": "组织答案",
  "polish-expression": "打磨表达",
  "draft-paragraph": "形成段落",
};

const EXPRESSION_TYPES = new Set(["standard-expression", "golden-sentence", "title-sentence", "transition-sentence"]);

export function AnswerWorkbenchPanel({ materials, onSaveDraftAsMaterial, onSendToRewrite }: AnswerWorkbenchPanelProps) {
  const [draft, setDraft] = useState<AnswerWorkbenchStructuredDraft>(() =>
    createStructuredAnswerDraft({
      topicSlug: "grassroots-governance",
      questionTypeSlug: "countermeasure",
      goalId: "build-answer",
      keyword: "",
    }),
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const template = useMemo(() => getAnswerTemplate(draft.questionTypeSlug), [draft.questionTypeSlug]);
  const ranked = useMemo(() => rankCallableMaterials(materials, draft), [draft, materials]);
  const groupedMaterials = useMemo(
    () => groupCallableMaterials(ranked.slice(0, 36).map((item) => item.material)),
    [ranked],
  );
  const callableExpressions = useMemo(
    () => ranked.filter((item) => EXPRESSION_TYPES.has(item.material.materialType)).slice(0, 6),
    [ranked],
  );
  const renderedMarkdown = useMemo(() => renderStructuredDraftToMarkdown(draft), [draft]);
  const activeSlot = useMemo(
    () => draft.slots.find((slot) => slot.id === draft.activeSlotId) ?? draft.slots[0],
    [draft.activeSlotId, draft.slots],
  );
  const canUseDraft = renderedMarkdown.trim().length > 0;

  const updateDraft = (patch: Partial<Pick<AnswerWorkbenchStructuredDraft, "topicSlug" | "goalId" | "keyword">>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setCopyState("idle");
  };

  const changeQuestionType = (questionTypeSlug: string) => {
    setDraft((current) =>
      createStructuredAnswerDraft({
        topicSlug: current.topicSlug,
        questionTypeSlug,
        goalId: current.goalId,
        keyword: current.keyword,
      }),
    );
    setCopyState("idle");
  };

  const insertMaterial = (material: MaterialDraft, mode: "title" | "excerpt" | "content") => {
    setDraft((current) => insertMaterialIntoSlot(current, current.activeSlotId, material, mode));
    setCopyState("idle");
  };

  const updateSlotContent = (slotId: string, contentMd: string) => {
    setDraft((current) => updateStructuredDraftSlot(current, slotId, contentMd));
    setCopyState("idle");
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(renderedMarkdown);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const saveDraft = () => {
    if (!canUseDraft) {
      return;
    }

    onSaveDraftAsMaterial(buildMaterialInputFromAnswerDraft(draft));
  };

  const sendToRewrite = () => {
    if (!canUseDraft) {
      return;
    }

    onSendToRewrite(buildRewriteDraftFromAnswerDraft(draft));
  };

  return (
    <section className="answer-workbench" aria-label="调用工作台">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Answer Workbench</p>
          <h1>按主题、题型和写作目标调用素材。</h1>
        </div>
        <div className="storage-chip">
          <span>推荐素材</span>
          <strong>{ranked.length}</strong>
        </div>
      </header>

      <div className="answer-controls" aria-label="调用条件">
        <label>
          <span>主题</span>
          <select value={draft.topicSlug} onChange={(event) => updateDraft({ topicSlug: event.target.value })}>
            {BUILTIN_TOPICS.map((topic) => (
              <option key={topic.slug} value={topic.slug}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>题型</span>
          <select
            value={draft.questionTypeSlug}
            onChange={(event) => changeQuestionType(event.target.value)}
          >
            {BUILTIN_QUESTION_TYPES.map((questionType) => (
              <option key={questionType.slug} value={questionType.slug}>
                {questionType.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>写作目标</span>
          <select value={draft.goalId} onChange={(event) => updateDraft({ goalId: event.target.value as AnswerGoalId })}>
            {ANSWER_GOAL_IDS.map((goalId) => (
              <option key={goalId} value={goalId}>
                {ANSWER_GOAL_LABELS[goalId]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>关键词</span>
          <input
            value={draft.keyword}
            onChange={(event) => updateDraft({ keyword: event.target.value })}
            placeholder="例如：网格、养老、数字化"
          />
        </label>
      </div>

      <div className="answer-layout">
        <section className="answer-main-column" aria-label="推荐素材">
          <div className="answer-section-title">
            <div>
              <p className="eyebrow">Materials</p>
              <h2>
                {getTopicLabel(draft.topicSlug)} / {getQuestionTypeLabel(draft.questionTypeSlug)}
              </h2>
            </div>
            <span>{ANSWER_GOAL_LABELS[draft.goalId]}</span>
          </div>
          <label className="answer-active-slot">
            <span>当前插入槽位</span>
            <select
              value={draft.activeSlotId}
              onChange={(event) => setDraft((current) => ({ ...current, activeSlotId: event.target.value }))}
            >
              {draft.slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.title}
                </option>
              ))}
            </select>
          </label>

          {groupedMaterials.length === 0 ? (
            <div className="empty-list">
              <strong>暂无可调用素材</strong>
              <span>先在素材库确认入库，再回到这里按主题和题型调用。</span>
            </div>
          ) : (
            <div className="callable-groups">
              {groupedMaterials.map((group) => (
                <section key={group.materialType} className="callable-group">
                  <div className="callable-group-header">
                    <strong>{group.label}</strong>
                    <span>{group.materials.length}</span>
                  </div>
                  <div className="callable-card-list">
                    {group.materials.map((material) => {
                      const score = ranked.find((item) => item.material.id === material.id);

                      return (
                        <CallableMaterialCard
                          key={material.id}
                          score={score}
                          material={material}
                          onInsertExcerpt={() => insertMaterial(material, "excerpt")}
                          onInsertContent={() => insertMaterial(material, "content")}
                          onInsertTitle={() => insertMaterial(material, "title")}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="answer-side-column" aria-label="答题结构与草稿">
          <section className="answer-template-card">
            <div className="answer-section-title compact">
              <div>
                <p className="eyebrow">Slots</p>
                <h2>{template.title}</h2>
              </div>
              <span>{activeSlot?.title ?? "未选择"}</span>
            </div>
            <div className="answer-slot-grid" aria-label="结构槽位">
              {draft.slots.map((slot) => (
                <AnswerSlotCard
                  key={slot.id}
                  slot={slot}
                  active={slot.id === draft.activeSlotId}
                  onActivate={() => setDraft((current) => ({ ...current, activeSlotId: slot.id }))}
                  onChange={(contentMd) => updateSlotContent(slot.id, contentMd)}
                />
              ))}
            </div>
          </section>

          <section className="answer-template-card">
            <div className="answer-section-title compact">
              <div>
                <p className="eyebrow">Expressions</p>
                <h2>可直接调用表达</h2>
              </div>
            </div>
            {callableExpressions.length === 0 ? (
              <div className="empty-list compact">
                <strong>暂无匹配表达</strong>
                <span>补充规范表达、金句、标题句后会优先出现在这里。</span>
              </div>
            ) : (
              <div className="answer-expression-list">
                {callableExpressions.map((item) => (
                  <button
                    key={item.material.id}
                    type="button"
                    className="answer-expression"
                    onClick={() => insertMaterial(item.material, "excerpt")}
                  >
                    <strong>{item.material.title}</strong>
                    <span>{item.material.excerpt || item.material.contentMd}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="answer-preview-card answer-draft-card">
            <div className="answer-section-title compact">
              <div>
                <p className="eyebrow">Markdown</p>
                <h2>汇总预览</h2>
              </div>
              <span>{renderedMarkdown.trim().length} 字</span>
            </div>
            <pre>{renderedMarkdown || "选择槽位并插入素材后，这里会生成可复制的 Markdown 汇总。"}</pre>
            <div className="answer-draft-actions">
              <button type="button" className="ghost-button" onClick={copyDraft} disabled={!canUseDraft}>
                {copyState === "copied" ? "已复制" : copyState === "failed" ? "复制失败" : "复制全文"}
              </button>
              <button type="button" className="ghost-button" onClick={sendToRewrite} disabled={!canUseDraft}>
                送去 Rewrite 打磨
              </button>
              <button type="button" className="primary-button" onClick={saveDraft} disabled={!canUseDraft}>
                保存为新素材
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function AnswerSlotCard({
  slot,
  active,
  onActivate,
  onChange,
}: {
  readonly slot: AnswerSlot;
  readonly active: boolean;
  readonly onActivate: () => void;
  readonly onChange: (contentMd: string) => void;
}) {
  return (
    <article className={active ? "answer-slot-card active" : "answer-slot-card"}>
      <button type="button" className="answer-slot-header" onClick={onActivate}>
        <strong>{slot.title}</strong>
        <span>{slot.hint}</span>
      </button>
      <textarea
        value={slot.contentMd}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onActivate}
        placeholder="选择素材后插入到这里，也可以手动补写。"
        aria-label={`${slot.title}槽位`}
      />
    </article>
  );
}

function CallableMaterialCard({
  material,
  score,
  onInsertExcerpt,
  onInsertContent,
  onInsertTitle,
}: {
  readonly material: MaterialDraft;
  readonly score: CallableMaterialScore | undefined;
  readonly onInsertExcerpt: () => void;
  readonly onInsertContent: () => void;
  readonly onInsertTitle: () => void;
}) {
  return (
    <article className="callable-card">
      <div className="callable-card-header">
        <div>
          <strong>{material.title}</strong>
          <span>
            {getMaterialTypeLabel(material.materialType)} / {material.source || "未标来源"}
          </span>
        </div>
        <small>{score?.score ?? 0}</small>
      </div>
      <p>{material.excerpt || material.contentMd || "暂无正文"}</p>
      <div className="callable-reasons">
        {(score?.reasons.slice(0, 3) ?? []).map((reason) => (
          <span key={reason}>{reason}</span>
        ))}
      </div>
      <div className="callable-actions">
        <button type="button" className="link-button" onClick={onInsertExcerpt}>
          插入摘要
        </button>
        <button type="button" className="link-button" onClick={onInsertContent}>
          插入正文
        </button>
        <button type="button" className="link-button" onClick={onInsertTitle}>
          插入双链
        </button>
      </div>
    </article>
  );
}
